import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import {
    extractEXIF,
    validateTimestamp,
    validateQuality,
    validateLocation,
    validateAIGenerated,
    calculateFileHash
} from '../services/validation.js';
import {
    saveIncident,
    uploadImageToStorage,
    uploadThumbnailToStorage,
    checkDuplicateIncident,
    getIncidents,
    getIncidentById,
    updateIncidentStatus,
    getIncidentStats,
    getTrainingData
} from '../services/incidentService.js';

const router = express.Router();

// Configure multer for file upload (from camera)
const storage = multer.memoryStorage(); // Store in memory for processing

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG allowed.'));
        }
    }
});

/**
 * POST /api/incidents
 * Submit new incident with image (from camera)
 */
router.post('/', upload.single('image'), async (req, res) => {
    try {
        console.log('📤 New incident submission received');

        // Validate request
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No image file provided. Please capture a photo using the camera.' 
            });
        }

        // Validate required fields
        const { ward, type } = req.body;
        if (!ward || !type) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: ward and type are required' 
            });
        }

        // Validate type enum
        const validTypes = ['waterlogging', 'pothole', 'drainage'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid incident type. Must be one of: waterlogging, pothole, drainage' 
            });
        }

        // Extract EXIF data
        console.log('🔍 Extracting EXIF data...');
        const exifData = extractEXIF(req.file.buffer);

        // Calculate file hash for duplicate detection
        const fileHash = calculateFileHash(req.file.buffer);

        // Check for duplicates
        const isDuplicate = await checkDuplicateIncident(fileHash);
        if (isDuplicate) {
            console.log('⚠️  Duplicate image detected');
            return res.status(409).json({
                success: false,
                error: 'Duplicate incident - this image was already submitted',
                status: 'duplicate'
            });
        }

        // Parse GPS data from request
        const userGPS = req.body.gpsLatitude && req.body.gpsLongitude ? {
            latitude: parseFloat(req.body.gpsLatitude),
            longitude: parseFloat(req.body.gpsLongitude),
            accuracy: parseFloat(req.body.gpsAccuracy) || null
        } : null;

        // Perform validations
        console.log('✅ Running validation checks...');
        const validationResults = {
            timestamp: validateTimestamp(exifData),
            aiGenerated: await validateAIGenerated(req.file),
            location: validateLocation(exifData, userGPS, ward),
            quality: validateQuality(req.file, exifData)
        };

        // Calculate overall validation score
        const checks = [
            validationResults.timestamp?.passed,
            validationResults.aiGenerated?.passed,
            validationResults.location?.passed,
            validationResults.quality?.passed
        ];
        const passedChecks = checks.filter(check => check === true).length;
        const totalChecks = checks.filter(check => check !== undefined).length;
        const overallScore = totalChecks === 0 ? 0 : Math.round((passedChecks / totalChecks) * 100);

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `incident-${timestamp}-${fileHash.substring(0, 8)}.jpg`;

        // Process image with sharp
        const processedImage = await sharp(req.file.buffer)
            .jpeg({ quality: 90 })
            .toBuffer();

        // Generate thumbnail
        const thumbnailBuffer = await sharp(req.file.buffer)
            .resize(400, 300, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Upload to Supabase Storage
        console.log('💾 Uploading images to Supabase Storage...');

        // Upload original image (processedImage is already a Buffer)
        const imageUploadResult = await uploadImageToStorage(processedImage, filename);
        
        // Upload thumbnail
        const thumbnailFilename = `thumb-${filename}`;
        const thumbnailUploadResult = await uploadThumbnailToStorage(thumbnailBuffer, thumbnailFilename);

        // Prepare incident data for Supabase
        const incidentData = {
            type: type,
            ward: ward,
            description: req.body.description || '',
            
            // GPS data
            gps_latitude: userGPS?.latitude || null,
            gps_longitude: userGPS?.longitude || null,
            gps_accuracy: userGPS?.accuracy || null,
            ward_verified: false,
            
            // Image data
            image_filename: filename,
            image_original_name: req.file.originalname || 'camera-capture.jpg',
            image_path: imageUploadResult.path,
            image_thumbnail_path: thumbnailUploadResult.path,
            image_size: req.file.size,
            image_mime_type: req.file.mimetype,
            image_hash: fileHash,
            image_url: imageUploadResult.url,
            image_storage_path: imageUploadResult.path,
            
            // EXIF data
            exif_date_time: exifData?.dateTime || null,
            exif_date_time_original: exifData?.dateTimeOriginal || null,
            exif_gps_latitude: exifData?.gps?.latitude || null,
            exif_gps_longitude: exifData?.gps?.longitude || null,
            exif_gps_altitude: exifData?.gps?.altitude || null,
            exif_camera_make: exifData?.camera?.make || null,
            exif_camera_model: exifData?.camera?.model || null,
            exif_camera_software: exifData?.camera?.software || null,
            exif_image_width: exifData?.imageSize?.width || null,
            exif_image_height: exifData?.imageSize?.height || null,
            
            // Validation results (stored as JSONB)
            validation_timestamp: validationResults.timestamp || null,
            validation_ai_generated: validationResults.aiGenerated || null,
            validation_location: validationResults.location || null,
            validation_quality: validationResults.quality || null,
            validation_overall_score: overallScore,
            
            // Status
            status: 'pending',
            submitted_at: new Date().toISOString()
        };

        // Location point will be automatically set by database trigger from GPS coordinates
        // No need to set it manually here

        // Save to Supabase
        const savedIncident = await saveIncident(incidentData);

        console.log(`✅ Incident saved! ID: ${savedIncident.id}, Score: ${overallScore}%`);

        // Return response
        res.status(201).json({
            success: true,
            message: 'Incident reported successfully',
            incident: {
                id: savedIncident.id,
                type: savedIncident.type,
                ward: savedIncident.ward,
                validationScore: overallScore,
                validation: validationResults,
                imageUrl: savedIncident.image_url,
                thumbnailUrl: thumbnailUploadResult.url,
                status: savedIncident.status,
                submittedAt: savedIncident.submitted_at
            }
        });

    } catch (error) {
        console.error('❌ Error submitting incident:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit incident',
            details: error.message
        });
    }
});

/**
 * GET /api/incidents
 * Get all incidents with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            type: req.query.type,
            ward: req.query.ward,
            minScore: req.query.minScore ? parseInt(req.query.minScore) : null
        };

        const pagination = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        };

        const result = await getIncidents(filters, pagination);

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });

    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch incidents',
            details: error.message
        });
    }
});

/**
 * GET /api/incidents/:id
 * Get specific incident by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const incident = await getIncidentById(req.params.id);

        if (!incident) {
            return res.status(404).json({ 
                success: false,
                error: 'Incident not found' 
            });
        }

        res.json({
            success: true,
            data: incident
        });

    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch incident',
            details: error.message
        });
    }
});

/**
 * PATCH /api/incidents/:id
 * Update incident status (for authority review)
 */
router.patch('/:id', async (req, res) => {
    try {
        const { status, reviewedBy } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const validStatuses = ['pending', 'verified', 'rejected', 'duplicate'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: pending, verified, rejected, duplicate'
            });
        }

        const updatedIncident = await updateIncidentStatus(req.params.id, status, reviewedBy);

        res.json({
            success: true,
            message: 'Incident updated successfully',
            data: updatedIncident
        });

    } catch (error) {
        console.error('Error updating incident:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update incident',
            details: error.message
        });
    }
});

/**
 * GET /api/incidents/stats/summary
 * Get statistics for dashboard
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = await getIncidentStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch statistics',
            details: error.message
        });
    }
});

/**
 * GET /api/incidents/training/export
 * Export incidents for ML training
 */
router.get('/training/export', async (req, res) => {
    try {
        const { minScore = 75, format = 'json' } = req.query;

        const filters = {
            minScore: parseInt(minScore)
        };

        const trainingData = await getTrainingData(filters);

        if (format === 'csv') {
            // Basic CSV conversion
            const headers = ['id', 'type', 'ward', 'description', 'status', 'validation_overall_score', 'image_url', 'submitted_at'];
            let csv = headers.join(',') + '\n';
            
            trainingData.forEach(incident => {
                const row = [
                    incident.id,
                    incident.type,
                    incident.ward,
                    `"${(incident.description || '').replace(/"/g, '""')}"`,
                    incident.status,
                    incident.validation_overall_score,
                    incident.image_url,
                    incident.submitted_at
                ];
                csv += row.join(',') + '\n';
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=training_data.csv');
            res.send(csv);
        } else {
            res.json({
                success: true,
                count: trainingData.length,
                data: trainingData
            });
        }

    } catch (error) {
        console.error('Error exporting training data:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to export training data',
            details: error.message
        });
    }
});

export default router;

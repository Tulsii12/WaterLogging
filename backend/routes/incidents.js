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

// Configure multer for file upload
const storage = multer.memoryStorage();
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
 * Submit new incident with image validation
 */
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image file provided.' });
        }

        const { ward, type, description } = req.body;
        if (!ward || !type) {
            return res.status(400).json({ success: false, error: 'Missing required fields: ward and type' });
        }

        const exifData = extractEXIF(req.file.buffer);
        const fileHash = calculateFileHash(req.file.buffer);

        if (await checkDuplicateIncident(fileHash)) {
            return res.status(409).json({ success: false, error: 'Duplicate incident detected' });
        }

        const userGPS = req.body.gpsLatitude ? {
            latitude: parseFloat(req.body.gpsLatitude),
            longitude: parseFloat(req.body.gpsLongitude)
        } : null;

        const validationResults = {
            timestamp: validateTimestamp(exifData),
            aiGenerated: await validateAIGenerated(req.file),
            location: validateLocation(exifData, userGPS, ward),
            quality: validateQuality(req.file, exifData)
        };

        const filename = `incident-${Date.now()}-${fileHash.substring(0, 8)}.jpg`;
        const processedImage = await sharp(req.file.buffer).jpeg({ quality: 90 }).toBuffer();
        const thumbnailBuffer = await sharp(req.file.buffer).resize(400, 300, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();

        const imageUpload = await uploadImageToStorage(processedImage, filename);
        const thumbUpload = await uploadThumbnailToStorage(thumbnailBuffer, `thumb-${filename}`);

        const incidentData = {
            type, ward, description,
            image_url: imageUpload.url,
            image_hash: fileHash,
            validation_overall_score: 100, // Replace with actual score logic if needed
            status: 'pending',
            submitted_at: new Date().toISOString()
        };

        const saved = await saveIncident(incidentData);
        res.status(201).json({ success: true, incident: saved });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET all incidents
router.get('/', async (req, res) => {
    try {
        const result = await getIncidents(req.query);
        res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET stats
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = await getIncidentStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET by ID
router.get('/:id', async (req, res) => {
    try {
        const incident = await getIncidentById(req.params.id);
        incident ? res.json({ success: true, data: incident }) : res.status(404).json({ error: 'Not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
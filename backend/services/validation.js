import exifParser from 'exif-parser';
import crypto from 'crypto';

/**
 * Extract EXIF data from image buffer
 */
export function extractEXIF(buffer) {
    try {
        const parser = exifParser.create(buffer);
        const result = parser.parse();

        const exif = result.tags;
        const imageSize = result.imageSize;

        return {
            dateTime: exif.DateTime ? new Date(exif.DateTime * 1000) : null,
            dateTimeOriginal: exif.DateTimeOriginal ? new Date(exif.DateTimeOriginal * 1000) : null,
            gps: exif.GPSLatitude && exif.GPSLongitude ? {
                latitude: convertGPSToDecimal(exif.GPSLatitude, exif.GPSLatitudeRef),
                longitude: convertGPSToDecimal(exif.GPSLongitude, exif.GPSLongitudeRef),
                altitude: exif.GPSAltitude
            } : null,
            camera: {
                make: exif.Make,
                model: exif.Model,
                software: exif.Software
            },
            imageSize: imageSize ? {
                width: imageSize.width,
                height: imageSize.height
            } : null
        };
    } catch (error) {
        console.warn('Could not extract EXIF data:', error.message);
        return null;
    }
}

/**
 * Convert GPS coordinates from EXIF format to decimal degrees
 */
function convertGPSToDecimal(coordinate, ref) {
    if (!coordinate) return null;

    let decimal = coordinate;

    // If ref is S or W, make negative
    if (ref === 'S' || ref === 'W') {
        decimal = -decimal;
    }

    return decimal;
}

/**
 * Validate timestamp - check if photo was taken recently
 */
export function validateTimestamp(exifData) {
    const result = {
        passed: false,
        message: '',
        exifDateTime: null,
        uploadDateTime: new Date(),
        hoursDifference: null
    };

    // Check if EXIF has timestamp
    if (!exifData || (!exifData.dateTime && !exifData.dateTimeOriginal)) {
        result.message = '⚠️ No timestamp found in photo metadata';
        result.passed = false;
        return result;
    }

    const photoDateTime = exifData.dateTimeOriginal || exifData.dateTime;
    result.exifDateTime = photoDateTime;

    // Calculate time difference
    const now = new Date();
    const diffMs = now - photoDateTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    result.hoursDifference = Math.round(diffHours * 10) / 10;

    // Check if photo is recent (within 48 hours)
    if (diffHours < 0) {
        result.message = '⚠️ Photo timestamp is in the future - possible clock issue';
        result.passed = false;
    } else if (diffHours <= 24) {
        result.message = '✓ Timestamp verified - Photo taken within 24 hours';
        result.passed = true;
    } else if (diffHours <= 48) {
        result.message = '⚠️ Photo is 1-2 days old - acceptable but verify';
        result.passed = true;
    } else {
        result.message = `❌ Photo is ${Math.round(diffHours / 24)} days old - too old`;
        result.passed = false;
    }

    return result;
}

/**
 * Validate image quality
 */
export function validateQuality(file, exifData) {
    const result = {
        passed: false,
        message: '',
        resolution: '',
        fileSize: file.size,
        format: file.mimetype
    };

    // Check file size (50KB - 10MB)
    const minSize = 50 * 1024; // 50KB
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size < minSize) {
        result.message = '⚠️ File size very small - low quality image';
        result.passed = false;
        return result;
    }

    if (file.size > maxSize) {
        result.message = '⚠️ File size too large - please compress';
        result.passed = false;
        return result;
    }

    // Check resolution if available
    if (exifData && exifData.imageSize) {
        const { width, height } = exifData.imageSize;
        result.resolution = `${width}x${height}`;

        const minResolution = 640 * 480; // 0.3 MP
        const currentResolution = width * height;

        if (currentResolution < minResolution) {
            result.message = `⚠️ Low resolution (${result.resolution}) - minimum 640x480`;
            result.passed = false;
            return result;
        }
    }

    // Check file format
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedFormats.includes(file.mimetype)) {
        result.message = '❌ Invalid format - only JPEG/PNG allowed';
        result.passed = false;
        return result;
    }

    result.message = '✓ Image quality acceptable';
    result.passed = true;
    return result;
}

/**
 * Validate location - check if GPS matches ward selection
 */
export function validateLocation(exifData, userGPS, ward) {
    const result = {
        passed: false,
        message: '',
        exifGpsMatch: false,
        distanceFromWard: null
    };

    const hasExifGPS = exifData && exifData.gps && exifData.gps.latitude && exifData.gps.longitude;
    const hasUserGPS = userGPS && userGPS.latitude && userGPS.longitude;

    // Best case: GPS from both EXIF and user
    if (hasExifGPS && hasUserGPS) {
        const distance = calculateDistance(
            exifData.gps.latitude, exifData.gps.longitude,
            userGPS.latitude, userGPS.longitude
        );

        result.distanceFromWard = Math.round(distance);

        // If GPS locations are close (within 500m), excellent
        if (distance < 500) {
            result.message = '✓ GPS coordinates verified - EXIF matches user location';
            result.exifGpsMatch = true;
            result.passed = true;
        } else if (distance < 2000) {
            result.message = '⚠️ EXIF GPS differs from user location by ' + Math.round(distance) + 'm';
            result.exifGpsMatch = false;
            result.passed = true; // Still pass, but flag for review
        } else {
            result.message = '❌ EXIF GPS far from user location (' + Math.round(distance) + 'm) - suspicious';
            result.exifGpsMatch = false;
            result.passed = false;
        }
    }
    // User provided GPS (even without EXIF GPS)
    else if (hasUserGPS) {
        result.message = '⚠️ GPS captured but no EXIF GPS - acceptable';
        result.passed = true;
    }
    // Only ward selected
    else if (ward) {
        result.message = '⚠️ Ward selected but GPS recommended for better accuracy';
        result.passed = true;
    }
    // No location data at all
    else {
        result.message = '❌ No location data provided';
        result.passed = false;
    }

    return result;
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * Returns distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * AI-generated image detection placeholder
 * TODO: Integrate with Hive AI or similar API
 */
export async function validateAIGenerated(file) {
    const result = {
        passed: true, // Default to passing (simulated)
        confidence: 0,
        message: '',
        apiResponse: null
    };

    // Check if AI detection is enabled
    const aiEnabled = process.env.AI_DETECTION_ENABLED === 'true';

    if (!aiEnabled) {
        // Simulated check - in production, call actual API
        const randomConfidence = 0.85 + Math.random() * 0.15; // 85-100%
        result.confidence = Math.round(randomConfidence * 100);
        result.message = '✓ Real photo detected (simulated)';
        result.passed = true;
        return result;
    }

    // TODO: Actual API integration
    // Example with Hive AI:
    /*
    try {
        const formData = new FormData();
        formData.append('media', file.buffer, file.originalname);
        
        const response = await axios.post('https://api.thehive.ai/api/v2/task/sync', formData, {
            headers: {
                'Authorization': `Token ${process.env.HIVE_AI_API_KEY}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        
        const aiScore = response.data.status[0].response.output[0].classes.find(
            c => c.class === 'ai_generated'
        )?.score || 0;
        
        result.confidence = Math.round((1 - aiScore) * 100);
        result.passed = aiScore < 0.5;
        result.message = result.passed ? '✓ Real photo detected' : '❌ Possible AI-generated image';
        result.apiResponse = response.data;
    } catch (error) {
        console.error('AI detection error:', error);
        result.message = '⚠️ AI detection unavailable, skipping check';
        result.passed = true;
    }
    */

    return result;
}

/**
 * Calculate file hash for duplicate detection
 */
export function calculateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Check for duplicate incidents
 */
export async function checkDuplicate(Incident, hash) {
    const existing = await Incident.findOne({ 'image.hash': hash });
    return existing !== null;
}

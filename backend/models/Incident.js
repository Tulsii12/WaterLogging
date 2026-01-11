import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
    // Basic incident information
    type: {
        type: String,
        required: true,
        enum: ['waterlogging', 'pothole', 'drainage'],
        index: true
    },
    ward: {
        type: String,
        required: true,
        index: true
    },
    description: {
        type: String,
        maxlength: 1000
    },

    // Location data
    location: {
        gps: {
            latitude: Number,
            longitude: Number,
            accuracy: Number
        },
        wardVerified: {
            type: Boolean,
            default: false
        }
    },

    // Image data
    image: {
        filename: {
            type: String,
            required: true
        },
        originalName: String,
        path: String,
        thumbnailPath: String,
        size: Number,
        mimeType: String,
        hash: String, // For duplicate detection
        url: String
    },

    // EXIF metadata from photo
    exifData: {
        dateTime: Date,
        dateTimeOriginal: Date,
        gps: {
            latitude: Number,
            longitude: Number,
            altitude: Number
        },
        camera: {
            make: String,
            model: String,
            software: String
        },
        imageSize: {
            width: Number,
            height: Number
        }
    },

    // Validation results
    validation: {
        timestamp: {
            passed: Boolean,
            message: String,
            exifDateTime: Date,
            uploadDateTime: Date,
            hoursDifference: Number
        },
        aiGenerated: {
            passed: Boolean,
            confidence: Number,
            message: String,
            apiResponse: mongoose.Schema.Types.Mixed
        },
        location: {
            passed: Boolean,
            message: String,
            exifGpsMatch: Boolean,
            distanceFromWard: Number
        },
        quality: {
            passed: Boolean,
            message: String,
            resolution: String,
            fileSize: Number,
            format: String
        },
        overallScore: {
            type: Number,
            min: 0,
            max: 100
        }
    },

    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'duplicate'],
        default: 'pending',
        index: true
    },

    // Timestamps
    submittedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    reviewedAt: Date,
    reviewedBy: String,

    // For ML training
    labels: [{
        type: String,
        addedBy: String,
        addedAt: Date
    }],
    usedForTraining: {
        type: Boolean,
        default: false
    },
    trainingDatasetVersion: String

}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for efficient queries
incidentSchema.index({ status: 1, submittedAt: -1 });
incidentSchema.index({ 'validation.overallScore': -1 });
incidentSchema.index({ type: 1, ward: 1 });
incidentSchema.index({ 'image.hash': 1 }); // For duplicate detection

// Virtual for image URL
incidentSchema.virtual('imageUrl').get(function () {
    if (this.image && this.image.filename) {
        return `/uploads/original/${this.image.filename}`;
    }
    return null;
});

// Method to calculate overall validation score
incidentSchema.methods.calculateValidationScore = function () {
    const checks = [
        this.validation.timestamp?.passed,
        this.validation.aiGenerated?.passed,
        this.validation.location?.passed,
        this.validation.quality?.passed
    ];

    const passedChecks = checks.filter(check => check === true).length;
    const totalChecks = checks.filter(check => check !== undefined).length;

    if (totalChecks === 0) return 0;

    this.validation.overallScore = Math.round((passedChecks / totalChecks) * 100);
    return this.validation.overallScore;
};

// Static method to get incidents for training
incidentSchema.statics.getTrainingData = function (filters = {}) {
    return this.find({
        status: 'verified',
        'validation.overallScore': { $gte: 75 },
        ...filters
    }).select('-__v -updatedAt');
};

// Static method to get statistics
incidentSchema.statics.getStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgScore: { $avg: '$validation.overallScore' }
            }
        }
    ]);

    const typeStats = await this.aggregate([
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 }
            }
        }
    ]);

    return {
        byStatus: stats,
        byType: typeStats,
        total: await this.countDocuments()
    };
};

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;

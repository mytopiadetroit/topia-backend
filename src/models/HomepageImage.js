const mongoose = require('mongoose');

const homepageImageSchema = new mongoose.Schema(
    {
        image: {
            type: String,
            required: true,
            trim: true,
        },
        section: {
            type: String,
            required: true,
            enum: ['hero', 'mission', 'resource', 'circle'],
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

// Index for better query performance
homepageImageSchema.index({ section: 1, isActive: 1 });

module.exports = mongoose.model('HomepageImage', homepageImageSchema);

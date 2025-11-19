const mongoose = require('mongoose')

const settingSchema = new mongoose.Schema(
    {
        image: {
            type: String,
            required: true,
            trim: true,
        },

        pagename: {
            type: String
        }

    },
    {
        timestamps: true,
    },
)

// // Index for better query performance
// gallerySchema.index({ isActive: 1, order: 1 })
// gallerySchema.index({ createdAt: -1 })

module.exports = mongoose.model('Setting', settingSchema)

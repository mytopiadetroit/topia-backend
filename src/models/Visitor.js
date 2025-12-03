const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        isMember: {
            type: Boolean,
            default: false,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        visitCount: {
            type: Number,
            default: 1,
        },
        lastVisit: {
            type: Date,
            default: Date.now,
        },
        visits: [{
            timestamp: {
                type: Date,
                default: Date.now,
            },
            checkedInBy: {
                type: String,
                enum: ['self', 'admin'],
                default: 'self'
            },
            adminId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: null
            }
        }],
        isArchived: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

// Index for better query performance
visitorSchema.index({ phone: 1 });
visitorSchema.index({ userId: 1 });
visitorSchema.index({ lastVisit: -1 });

module.exports = mongoose.model('Visitor', visitorSchema);

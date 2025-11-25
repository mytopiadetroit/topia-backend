const mongoose = require('mongoose')

const pointsAdjustmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: ['add', 'subtract'],
      required: true,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
    },
    rewardTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RewardTask',
      default: null,
    },
    customReason: {
      type: String,
      default: '',
    },
    previousBalance: {
      type: Number,
      required: true,
    },
    newBalance: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
)

// Index for better query performance
pointsAdjustmentSchema.index({ user: 1, createdAt: -1 })
pointsAdjustmentSchema.index({ adjustedBy: 1 })

module.exports = mongoose.model('PointsAdjustment', pointsAdjustmentSchema)

const mongoose = require('mongoose')

const rewardTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    reward: {
      type: Number,
      required: true,
      min: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index for better query performance
rewardTaskSchema.index({ isVisible: 1, order: 1 })
rewardTaskSchema.index({ taskId: 1 })

module.exports = mongoose.model('RewardTask', rewardTaskSchema)

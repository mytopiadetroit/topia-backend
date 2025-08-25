const mongoose = require('mongoose')

const rewardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: String,
      required: true,
    },
    taskTitle: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    proofType: {
      type: String,
      enum: ['text', 'image', 'audio', 'video'],
      required: true,
    },
    proofText: {
      type: String,
      default: '',
    },
    proofImage: {
      type: String,
      default: '',
    },
    proofAudio: {
      type: String,
      default: '',
    },
    proofVideo: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Index for better query performance
rewardSchema.index({ user: 1, status: 1 })
rewardSchema.index({ status: 1, createdAt: -1 })
rewardSchema.index({ taskId: 1, user: 1 })

// Virtual for total user rewards
rewardSchema.statics.getUserTotalRewards = async function (userId) {
  const result = await this.aggregate([
    {
      $match: { user: new mongoose.Types.ObjectId(userId), status: 'approved' },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return result.length > 0 ? result[0].total : 0
}

// Check if user completed all tasks for bonus
rewardSchema.statics.checkBonusEligibility = async function (userId) {
  const completedTasks = await this.distinct('taskId', {
    user: new mongoose.Types.ObjectId(userId),
    status: 'approved',
  })

  const requiredTasks = [
    'join-groove',
    'follow-ig',
    'save-whatsapp',
    'google-review',
    'tag-selfie',
    'first-experience',
    'subscribe-yt',
    'share-journey',
    'bring-friend',
    'special-reward',
  ]

  return completedTasks.length >= requiredTasks.length
}

module.exports = mongoose.model('Reward', rewardSchema)

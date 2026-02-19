const mongoose = require('mongoose')

const pendingChangeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changeType: {
    type: String,
    enum: ['profile', 'subscription', 'account'],
    required: true
  },
  currentData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  requestedData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: {
    type: String
  }
})

pendingChangeSchema.index({ userId: 1, status: 1 })

const PendingChange = mongoose.model('PendingChange', pendingChangeSchema)
module.exports = PendingChange

const mongoose = require('mongoose');

const smsNotificationSchema = new mongoose.Schema({
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    name: String,
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'pending'
    },
    messageSid: String,
    error: String,
    sentAt: Date
  }],
  message: {
    type: String,
    required: true,
    maxlength: 1600 // Twilio limit
  },
  type: {
    type: String,
    enum: ['bulk', 'birthday', 'event', 'sale', 'promotion', 'reminder', 'custom', 'topia_circle'],
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['verified', 'incomplete', 'custom', 'birthday', 'topia_members'],
    required: true
  },
  totalRecipients: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledFor: Date,
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'completed', 'failed'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Index for faster queries
smsNotificationSchema.index({ type: 1, createdAt: -1 });
smsNotificationSchema.index({ status: 1, scheduledFor: 1 });
smsNotificationSchema.index({ 'recipients.userId': 1 });

const SmsNotification = mongoose.model('SmsNotification', smsNotificationSchema);
module.exports = SmsNotification;

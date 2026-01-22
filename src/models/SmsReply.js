const mongoose = require('mongoose');

const smsReplySchema = new mongoose.Schema({
 
  messageSid: {
    type: String,
    required: true,
    unique: true
  },
  from: {
    type: String,
    required: true 
  },
  to: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true 
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null 
  },
  userPhone: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    default: null
  },
  messageType: {
    type: String,
    enum: ['reply', 'opt_out', 'opt_in', 'help', 'stop', 'start', 'other'],
    default: 'reply'
  },
  isOptOut: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['received', 'processed', 'responded', 'ignored'],
    default: 'received'
  },
  adminResponse: {
    message: String,
    sentAt: Date,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  

  twilioData: {
    accountSid: String,
    messagingServiceSid: String,
    numMedia: Number,
    numSegments: Number,
    smsStatus: String,
    apiVersion: String
  }
});

smsReplySchema.index({ from: 1, receivedAt: -1 });
smsReplySchema.index({ user: 1, receivedAt: -1 });
smsReplySchema.index({ messageType: 1, receivedAt: -1 });
smsReplySchema.index({ status: 1, receivedAt: -1 });
smsReplySchema.index({ messageSid: 1 }, { unique: true });
smsReplySchema.pre('save', function(next) {
  if (this.isNew) {
    const body = this.body.toLowerCase().trim();
  
    const optOutKeywords = ['stop', 'unsubscribe', 'opt out', 'optout', 'quit', 'cancel', 'end'];
    const optInKeywords = ['start', 'subscribe', 'opt in', 'optin', 'yes', 'join'];
    const helpKeywords = ['help', 'info', 'information'];
    
    if (optOutKeywords.some(keyword => body.includes(keyword))) {
      this.messageType = 'opt_out';
      this.isOptOut = true;
    } else if (optInKeywords.some(keyword => body.includes(keyword))) {
      this.messageType = 'opt_in';
    } else if (helpKeywords.some(keyword => body.includes(keyword))) {
      this.messageType = 'help';
    } else {
      this.messageType = 'reply';
    }
  }
  next();
});

const SmsReply = mongoose.model('SmsReply', smsReplySchema);
module.exports = SmsReply;
const mongoose = require('mongoose')

const subscriptionSettingsSchema = new mongoose.Schema({
  monthlyPrice: {
    type: Number,
    required: true,
    default: 50
  },
  flierImage: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: 'Step into a world of wellness, where exclusive rewards, personalized benefits, and a community of growth await.'
  },
  features: [{
    title: String,
    description: String
  }],
  minimumSubscriptionMonths: {
    type: Number,
    default: 2
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

subscriptionSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

const SubscriptionSettings = mongoose.model('SubscriptionSettings', subscriptionSettingsSchema)
module.exports = SubscriptionSettings
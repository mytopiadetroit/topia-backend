const mongoose = require('mongoose')

const boxPickupSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  boxNumber: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'picked_up'],
    default: 'pending'
  },
  items: [{
    itemName: String,
    quantity: Number,
    notes: String
  }],
  scheduledDate: {
    type: Date,
    required: true
  },
  pickedUpDate: {
    type: Date
  },
  pickedUpBy: {
    type: String
  },
  notes: {
    type: String
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

boxPickupSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

boxPickupSchema.index({ userId: 1, createdAt: -1 })
boxPickupSchema.index({ subscriptionId: 1 })

const BoxPickup = mongoose.model('BoxPickup', boxPickupSchema)
module.exports = BoxPickup

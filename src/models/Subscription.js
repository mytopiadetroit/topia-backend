const mongoose = require('mongoose')

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  nextBillingDate: {
    type: Date,
    required: true
  },
  monthlyPrice: {
    type: Number,
    required: true
  },
  preferences: {
    type: [String],
    default: []
  },
  allergies: {
    type: [String],
    default: []
  },
  paymentMethodId: {
    type: String,
    required: true
  },
  selectedProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: String,
    productPrice: Number,
    type: {
      type: String,
      enum: ['product', 'variant', 'flavor'],
      default: 'product'
    },
    variantIndex: Number,
    flavorIndex: Number
  }],
  currentBoxItems: [{
    itemName: String,
    quantity: Number,
    notes: String
  }],
  billingHistory: [{
    date: Date,
    amount: Number,
    status: String,
    transactionId: String
  }],
  cancellationDate: {
    type: Date
  },
  cancellationReason: {
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

subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

const Subscription = mongoose.model('Subscription', subscriptionSchema)
module.exports = Subscription
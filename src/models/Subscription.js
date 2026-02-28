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
    enum: ['active', 'cancelled', 'expired', 'paused'],
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
  billingDayOfMonth: {
    type: Number,
    min: 1,
    max: 28,
    default: null
  },
  pausedAt: {
    type: Date,
    default: null
  },
  pausedBy: {
    type: String,
    enum: ['admin', 'user'],
    default: null
  },
  monthlyPrice: {
    type: Number,
    required: true,
    default: 100
  },
  boxValue: {
    type: Number,
    default: 200
  },
  billingAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'USA'
    }
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
  paymentInfo: {
    cardHolderName: String,
    cardLastFour: String,
    cardBrand: String,
    expiryMonth: String,
    expiryYear: String,
    billingZip: String
  },
  selectedProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
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
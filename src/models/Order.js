const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        image: String,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'unfulfilled', 'fulfilled', 'incomplete'],
      default: 'pending',
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    paymentMethod: {
      type: String,
      default: 'pay_at_pickup', // pay at store during pickup
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Generate order number before saving
OrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')

    // Get count of orders for today
    const todayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    )
    const todayEnd = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
    )

    const orderCount = await this.constructor.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd },
    })

    const count = (orderCount + 1).toString().padStart(3, '0')
    this.orderNumber = `ORD${year}${month}${day}${count}`
  }
  next()
})

module.exports = mongoose.model('Order', OrderSchema)

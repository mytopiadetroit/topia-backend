const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Please provide a product price'],
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  description: {
    main: {
      type: String,
      required: [true, 'Please provide a main description']
    },
    details: {
      type: String,
      required: [true, 'Please provide detailed description']
    }
  },
  images: {
    type: [String],
    required: [true, 'Please provide at least one product image']
  },
  tags: {
    type: [String],
    default: []
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productCategory',
    required: [true, 'Please provide a category']
  },
  primaryUse: {
    type: String,
    required: [true, 'Please provide primary use'],
    enum: ['therapeutic', 'functional']
  },
  hasStock: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);
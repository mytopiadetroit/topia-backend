const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const aboutUsSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  ourApproach: {
    type: String,
    default: ''
  },
  faqs: [faqSchema],
  contactInfo: {
    address: {
      type: String,
      default: ''
    },
    workingHours: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    }
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('AboutUs', aboutUsSchema);

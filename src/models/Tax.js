const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Sales Tax'
  },
  percentage: {
    type: Number,
    required: true,
    default: 7,
    min: 0,
    max: 100,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 100;
      },
      message: 'Tax percentage must be between 0 and 100'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const Tax = mongoose.models.Tax || mongoose.model('Tax', taxSchema);
module.exports = Tax;

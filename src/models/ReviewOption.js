const mongoose = require('mongoose')

const ReviewOptionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Please provide a label'],
      trim: true,
    },
    emoji: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('ReviewOption', ReviewOptionSchema)

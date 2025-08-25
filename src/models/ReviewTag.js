const mongoose = require('mongoose')

const ReviewTagSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Please provide a label'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('ReviewTag', ReviewTagSchema)

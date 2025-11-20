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
    tooltip: {
      type: String,
    }

  },
  { timestamps: true },
)

module.exports = mongoose.model('ReviewTag', ReviewTagSchema)

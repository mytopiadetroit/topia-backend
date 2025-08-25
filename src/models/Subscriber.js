'use strict'
const mongoose = require('mongoose')

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Subscriber', subscriberSchema)

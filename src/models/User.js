const mongoose = require('mongoose')

const userRegistrationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  birthday: {
    day: { type: String, required: true },
    month: { type: String, required: true },
    year: { type: String, required: true },
  },
  howDidYouHear: {
    type: String,
    required: true,
  },
  takesMedication: {
    type: Boolean,
    default: false,
  },
  medicationDetails: {
    type: String,
    default: '',
  },
  governmentId: {
    type: String,
    required: false,
  },
  avatar: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  status: {
    type: String,
    enum: ['pending', 'suspend', 'verified'],
    default: 'pending',
  },
  otp: {
    type: String,
    select: false, // Don't include in query results by default
  },
  otpExpires: {
    type: Date,
    select: false, // Don't include in query results by default
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const UserRegistration = mongoose.model('User', userRegistrationSchema)
module.exports = UserRegistration

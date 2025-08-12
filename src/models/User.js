const mongoose = require('mongoose');

const userRegistrationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  birthday: {
    day: { type: String, required: true },
    month: { type: String, required: true },
    year: { type: String, required: true }
  },
  howDidYouHear: {
    type: String,
    required: true
  },
  governmentId: {
    type: String, 
    required: false
  },
  avatar: {
    type: String,
    required: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const UserRegistration = mongoose.model('User', userRegistrationSchema);
module.exports = UserRegistration;
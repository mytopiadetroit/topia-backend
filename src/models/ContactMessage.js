const mongoose = require('mongoose');

const ContactMessageSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      unique: true,
      index: true
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

ContactMessageSchema.index({ email: 1 }, { unique: true });
ContactMessageSchema.index({ mobileNumber: 1 }, { unique: true });

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);



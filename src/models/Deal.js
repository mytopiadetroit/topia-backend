const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a deal title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    bannerImage: {
      type: String,
      required: [true, 'Please provide a banner image'],
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Please provide discount percentage'],
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide end date'],
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    showBanner: {
      type: Boolean,
      default: true,
    },
    bannerInterval: {
      type: Number,
      default: 30, // seconds
    },
  },
  {
    timestamps: true,
  }
);

// Virtual to check if deal is expired
DealSchema.virtual('isExpired').get(function () {
  return new Date() > this.endDate;
});

// Virtual to check if deal is live
DealSchema.virtual('isLive').get(function () {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate && this.isActive;
});

DealSchema.set('toJSON', { virtuals: true });
DealSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Deal', DealSchema);

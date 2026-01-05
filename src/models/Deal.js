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
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
      required: true,
    },
    discountPercentage: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    discountAmount: {
      type: Number,
      min: [0, 'Discount amount cannot be negative'],
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
  
    dealItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
       
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
        },
       
        flavorId: {
          type: mongoose.Schema.Types.ObjectId,
        },
      
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

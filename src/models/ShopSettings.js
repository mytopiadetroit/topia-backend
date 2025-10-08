const mongoose = require('mongoose');

const shopSettingsSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true
  },
  timings: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    isOpen: {
      type: Boolean,
      default: true
    },
    openingTime: {
      type: String,
      required: function() { return this.isOpen; },
      validate: {
        validator: function(v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: props => `${props.value} is not a valid time format (HH:MM)`
      }
    },
    closingTime: {
      type: String,
      required: function() { return this.isOpen; },
      validate: {
        validator: function(v) {
          if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)) return false;
          if (this.openingTime) {
            const [openingHour, openingMinute] = this.openingTime.split(':').map(Number);
            const [closingHour, closingMinute] = v.split(':').map(Number);
            return (closingHour > openingHour) || 
                  (closingHour === openingHour && closingMinute > openingMinute);
          }
          return true;
        },
        message: 'Closing time must be after opening time'
      }
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const ShopSettings = mongoose.models.ShopSettings || mongoose.model('ShopSettings', shopSettingsSchema);
module.exports = ShopSettings;

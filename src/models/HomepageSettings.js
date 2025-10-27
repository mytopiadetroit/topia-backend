const mongoose = require('mongoose');

const homepageSettingsSchema = new mongoose.Schema({
  rewardsSectionVisible: {
    type: Boolean,
    default: true
  },
  feedbackSectionVisible: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const HomepageSettings = mongoose.models.HomepageSettings || mongoose.model('HomepageSettings', homepageSettingsSchema);
module.exports = HomepageSettings;

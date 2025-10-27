const express = require('express');
const router = express.Router();
const {
  getHomepageSettings,
  updateHomepageSettings,
  toggleRewardsSection,
  toggleFeedbackSection
} = require('../controllers/homepageSettingsController');

router.route('/')
  .get(getHomepageSettings)
  .put(updateHomepageSettings);

router.put('/toggle-rewards', toggleRewardsSection);
router.put('/toggle-feedback', toggleFeedbackSection);

module.exports = router;

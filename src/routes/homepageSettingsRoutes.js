const express = require('express');
const router = express.Router();
const {
  getHomepageSettings,
  updateHomepageSettings,
  toggleRewardsSection,
  toggleFeedbackSection
} = require('../controllers/homepageSettingsController');
// const { authenticate } = require('../middlewares/authMiddleware');

// Public endpoint - no authentication required
router.get('/', getHomepageSettings);

// Admin endpoints - authentication can be added later if needed
router.put('/', updateHomepageSettings);
router.put('/toggle-rewards', toggleRewardsSection);
router.put('/toggle-feedback', toggleFeedbackSection);

module.exports = router;

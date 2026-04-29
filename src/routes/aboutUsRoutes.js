const express = require('express');
const router = express.Router();
const {
  getAboutUs,
  updateAboutUsContent,
  updateContactInfo,
  addFAQ,
  updateFAQ,
  deleteFAQ,
  reorderFAQs
} = require('../controllers/aboutUsController');
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware');

// Public route
router.get('/', getAboutUs);

// Admin routes
router.put('/content', authenticate, authorizationRole('admin'), updateAboutUsContent);
router.put('/contact-info', authenticate, authorizationRole('admin'), updateContactInfo);
router.post('/faqs', authenticate, authorizationRole('admin'), addFAQ);
router.put('/faqs/:faqId', authenticate, authorizationRole('admin'), updateFAQ);
router.delete('/faqs/:faqId', authenticate, authorizationRole('admin'), deleteFAQ);
router.put('/faqs/reorder', authenticate, authorizationRole('admin'), reorderFAQs);

module.exports = router;

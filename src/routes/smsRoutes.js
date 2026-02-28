const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware');

// All routes require admin authentication
router.use(authenticate);
router.use(authorizationRole('admin'));

// Send bulk SMS
router.post('/send-bulk', smsController.sendBulkSMS);

// Get SMS history
router.get('/history', smsController.getSMSHistory);

// Get SMS statistics (must be before /:id to avoid conflict)
router.get('/stats/overview', smsController.getSMSStats);

// Preview recipients before sending
router.post('/preview-recipients', smsController.previewRecipients);

// Birthday SMS - Manual trigger
router.post('/send-birthday-manual', smsController.sendBirthdaySMSManually);

// Preview birthday users
router.get('/preview-birthday-users', smsController.previewBirthdayUsers);

// Search users for individual SMS
router.get('/search-users', smsController.searchUsers);

// Send SMS to individual user
router.post('/send-individual', smsController.sendIndividualSMS);

// Send SMS to all Topia Circle members
router.post('/send-to-topia-members', smsController.sendToTopiaMembers);

// Preview Topia Circle members
router.get('/preview-topia-members', smsController.previewTopiaMembers);

// Debug birthday data
router.get('/debug-birthday-data', smsController.debugBirthdayData);

// Get SMS details (must be last to avoid route conflicts)
router.get('/:id', smsController.getSMSDetails);

module.exports = router;

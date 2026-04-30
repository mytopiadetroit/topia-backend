const express = require('express');
const router = express.Router();
const { getAllFAQs, addFAQ, updateFAQ, deleteFAQ } = require('../controllers/billingFAQController');
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware');

router.get('/', getAllFAQs);
router.post('/', authenticate, authorizationRole('admin'), addFAQ);
router.put('/:id', authenticate, authorizationRole('admin'), updateFAQ);
router.delete('/:id', authenticate, authorizationRole('admin'), deleteFAQ);

module.exports = router;

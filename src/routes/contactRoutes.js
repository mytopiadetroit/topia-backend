const express = require('express');
const router = express.Router();
const controller = require('@controllers/contactController');
const { authenticate, authorizationRole } = require('@middlewares/authMiddleware');

// Public: submit a contact message
router.post('/', controller.create);

// Admin: list all messages
router.get('/', authenticate, authorizationRole('admin'), controller.getAll);

// Admin: mark as read
router.put('/:id/read', authenticate, authorizationRole('admin'), controller.markRead);

// Admin: delete message
router.delete('/:id', authenticate, authorizationRole('admin'), controller.delete);

module.exports = router;



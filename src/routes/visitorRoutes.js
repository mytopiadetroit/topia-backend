const express = require('express');
const router = express.Router();
const {
    checkInVisitor,
    getAllVisitors,
    getVisitorDetails,
    deleteVisitor,
} = require('../controllers/visitorController');
const {
    authenticate,
    authorizationRole,
} = require('../middlewares/authMiddleware');

// Public route - check-in
router.post('/checkin', checkInVisitor);

// Admin routes
router.get(
    '/admin/all',
    authenticate,
    authorizationRole('admin'),
    getAllVisitors
);

router.get(
    '/admin/:id',
    authenticate,
    authorizationRole('admin'),
    getVisitorDetails
);

router.delete(
    '/admin/:id',
    authenticate,
    authorizationRole('admin'),
    deleteVisitor
);

module.exports = router;

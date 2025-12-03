const express = require('express');
const router = express.Router();
const {
    checkInVisitor,
    getAllVisitors,
    getVisitorDetails,
    archiveVisitor,
    unarchiveVisitor,
    getArchivedVisitors,
    adminCheckInUser,
    getVisitorByUserId,
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

// Archive visitor (soft delete)
router.put(
    '/admin/:id/archive',
    authenticate,
    authorizationRole('admin'),
    archiveVisitor
);

// Unarchive visitor
router.put(
    '/admin/:id/unarchive',
    authenticate,
    authorizationRole('admin'),
    unarchiveVisitor
);

// Get archived visitors
router.get(
    '/admin/archived/all',
    authenticate,
    authorizationRole('admin'),
    getArchivedVisitors
);

// Admin manual check-in for a user
router.post(
    '/admin/checkin/:userId',
    authenticate,
    authorizationRole('admin'),
    adminCheckInUser
);

// Admin get visitor by user ID
router.get(
    '/admin/user/:userId',
    authenticate,
    authorizationRole('admin'),
    getVisitorByUserId
);

module.exports = router;

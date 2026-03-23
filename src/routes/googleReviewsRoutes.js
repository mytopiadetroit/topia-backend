const express = require('express');
const router = express.Router();
const { getGoogleReviews, findPlaceId, testGoogleAPI, diagnoseAPIIssue } = require('../controllers/googleReviewsController');

// Get Google Reviews
router.get('/', getGoogleReviews);

// Helper route to find Place ID
router.get('/find-place', findPlaceId);

// Test Google API
router.get('/test', testGoogleAPI);

// Comprehensive diagnosis
router.get('/diagnose', diagnoseAPIIssue);

module.exports = router;
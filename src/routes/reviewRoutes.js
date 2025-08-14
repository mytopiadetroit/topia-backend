const express = require('express');
const router = express.Router();
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware');
const reviewController = require('../controllers/reviewController');

// Public list endpoint for website to fetch active review options
router.get('/', reviewController.getReviewOptions);

// Admin protected CRUD for options
router.post('/', authenticate, authorizationRole('admin'), reviewController.createReviewOption);
router.get('/:id', authenticate, authorizationRole('admin'), reviewController.getReviewOptionById);
router.put('/:id', authenticate, authorizationRole('admin'), reviewController.updateReviewOption);
router.delete('/:id', authenticate, authorizationRole('admin'), reviewController.deleteReviewOption);

// User endpoints
router.post('/submit', authenticate, reviewController.submitReviewResponse);
router.get('/product/:productId/aggregate', reviewController.getProductReviewAggregates);

module.exports = router;



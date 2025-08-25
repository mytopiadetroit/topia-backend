const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authenticate } = require('../middlewares/authMiddleware');

// All wishlist routes require auth 
router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.post('/:productId', wishlistController.addToWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);

module.exports = router;

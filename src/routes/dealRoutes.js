const express = require('express');
const router = express.Router();
const {
  getActiveDeals,
  getDealById,
  getBannerDeal,
  getAllDeals,
  createDeal,
  updateDeal,
  deleteDeal,
} = require('../controllers/dealController');
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

// Public routes
router.get('/active', getActiveDeals);
router.get('/banner', getBannerDeal);
router.get('/:id', getDealById);

// Admin routes
router.get('/', authenticate, authorizationRole('admin'), getAllDeals);
router.post('/', authenticate, authorizationRole('admin'), upload.single('bannerImage'), createDeal);
router.put('/:id', authenticate, authorizationRole('admin'), upload.single('bannerImage'), updateDeal);
router.delete('/:id', authenticate, authorizationRole('admin'), deleteDeal);

module.exports = router;

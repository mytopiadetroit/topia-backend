const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const {
    getHomepageImages,
    getAllHomepageImages,
    uploadHomepageImage,
    updateHomepageImage,
    deleteHomepageImage,
    toggleHomepageImageStatus,
} = require('../controllers/homepageImageController');
const {
    authenticate,
    authorizationRole,
} = require('../middlewares/authMiddleware');

// Public route - get active homepage images
router.get('/', getHomepageImages);

// Admin routes
router.get(
    '/admin/all',
    authenticate,
    authorizationRole('admin'),
    getAllHomepageImages
);

router.post(
    '/admin/upload',
    authenticate,
    authorizationRole('admin'),
    upload.single('image'),
    uploadHomepageImage
);

router.put(
    '/admin/:id',
    authenticate,
    authorizationRole('admin'),
    upload.single('image'),
    updateHomepageImage
);

router.delete(
    '/admin/:id',
    authenticate,
    authorizationRole('admin'),
    deleteHomepageImage
);

router.patch(
    '/admin/:id/toggle',
    authenticate,
    authorizationRole('admin'),
    toggleHomepageImageStatus
);

module.exports = router;

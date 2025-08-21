const express = require('express');
const router = express.Router();
const {
  
  getAllContent,
  getPublishedContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  getContentCategories,
  getContentStats
} = require('../controllers/contentController');
const upload = require('../middlewares/upload');


// const auth = require('../middlewares/authMiddleware');

// Public routes (for website)
router.get('/public', getPublishedContent);
router.get('/public/:id', getContentById);
router.get('/categories', getContentCategories);

// Admin routes (without authentication)
router.get('/admin', getAllContent);  // No auth
router.get('/admin/stats', getContentStats);  // No auth
router.get('/admin/:id', getContentById);  // No auth

router.post('/admin', 
  upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'videoThumbnail', maxCount: 1 }
  ]), 
  createContent  // No auth
);

router.put('/admin/:id', 
  upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'videoThumbnail', maxCount: 1 }
  ]), 
  updateContent  // No auth
);

router.delete('/admin/:id', deleteContent); 

module.exports = router;
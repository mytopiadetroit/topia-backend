const express = require('express')
const categoryController = require('../controllers/categoryController')
const router = express.Router()

// Apply upload middleware to routes that handle file uploads
router.post('/categories', 
  categoryController.upload.single('image'), 
  categoryController.createCategory
)

router.put('/categories/:id', 
  categoryController.upload.single('image'),
  categoryController.editCategory
)

router.delete('/categories/:id', categoryController.deleteCategory)
router.get('/categories', categoryController.getAllCategories)

module.exports = router

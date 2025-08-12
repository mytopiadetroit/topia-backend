const express = require('express');
const categoryController = require('../controllers/categoryController');
const router = express.Router();

router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.editCategory);
router.delete('/categories/:id', categoryController.deleteCategory);
router.get('/categories', categoryController.getAllCategories);

module.exports = router;

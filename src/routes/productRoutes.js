const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')

// Middleware to log request details for debugging
const logRequestDetails = (req, res, next) => {
  console.log('=== REQUEST DETAILS ===')
  console.log('Content-Type:', req.headers['content-type'])
  console.log('Request Method:', req.method)
  console.log('Request Path:', req.path)
  console.log('=== END REQUEST DETAILS ===')
  next()
}

// Apply logging middleware to all routes
router.use(logRequestDetails)

// Test upload endpoint for debugging
router.post(
  '/test-upload',
  productController.upload.array('images', 5),
  (req, res) => {
    console.log('Test upload request body:', req.body)
    console.log('Test upload files:', req.files)

    res.status(200).json({
      success: true,
      message: 'Test upload successful',
      files: req.files,
      body: req.body,
    })
  },
)

// Product routes
router
  .route('/')
  .get(productController.getAllProducts)
  .post(
    productController.upload.array('images', 5),
    productController.createProduct,
  )

router
  .route('/:id')
  .get(productController.getProduct)
  .put(
    productController.upload.array('images', 5),
    productController.updateProduct,
  )
  .delete(productController.deleteProduct)

// Update product order
router.put('/:productId/order', productController.updateProductOrder)

// Get related products (products from same category, excluding current product)
router.get('/:id/related', productController.getRelatedProducts)

module.exports = router

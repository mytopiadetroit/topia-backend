const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')


const logRequestDetails = (req, res, next) => {

  next()
}


router.use(logRequestDetails)


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

router.get('/all-no-pagination', productController.getAllProductsNoPagination)

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

// Toggle product active/inactive status
router.patch('/:productId/toggle-status', productController.toggleProductStatus)

// Get related products (products from same category, excluding current product)
router.get('/:id/related', productController.getRelatedProducts)

// Get products by category with pagination
router.get('/category/paginated/:categoryId', productController.getProductsByCategory)

module.exports = router

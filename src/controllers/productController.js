const Product = require('../models/Product')
const path = require('path')
const fs = require('fs')
const upload = require('../middlewares/upload')

exports.upload = upload

exports.createProduct = async (req, res) => {
  try {
    console.log('Request body:', req.body)
    console.log('Request files:', req.files)

    const productData = req.body

    if (req.files && req.files.length > 0) {
      productData.images = req.files.map((file) => {
        return file.location || `/uploads/${file.filename}`
      })
    }

    if (typeof productData.tags === 'string') {
      try {
        productData.tags = JSON.parse(productData.tags)
      } catch (error) {
        console.error('Error parsing tags:', error)
        productData.tags = productData.tags.split(',').map((tag) => tag.trim())
      }
    }

    // Parse reviewTags (array of ObjectId strings) if provided
    if (productData.reviewTags) {
      try {
        if (typeof productData.reviewTags === 'string') {
          const parsed = JSON.parse(productData.reviewTags)
          productData.reviewTags = Array.isArray(parsed) ? parsed : []
        }
      } catch (e) {
        productData.reviewTags = String(productData.reviewTags)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      }
    }

    if (typeof productData.description === 'string') {
      try {
        productData.description = JSON.parse(productData.description)
      } catch (error) {
        console.error('Error parsing description:', error)

        productData.description = {
          main: productData.description,
          details: '',
        }
      }
    }

    // Normalize stock/hasStock
    if (productData.stock != null) {
      productData.stock = Number(productData.stock) || 0
      productData.hasStock = productData.stock > 0
    }

    const product = new Product(productData)
    await product.save()

    res.status(201).json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error('Error creating product:', error)
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

exports.getAllProducts = async (req, res) => {
  try {
    const { categoryId, limit } = req.query
    let filter = {}

    if (categoryId) {
      filter.category = categoryId
    }

    let query = Product.find(filter)
      .populate('category', 'category')
      .populate('reviewTags', 'label isActive')

    if (limit) {
      const lim = Math.max(0, parseInt(limit, 10) || 0)
      if (lim > 0) query = query.limit(lim)
    }

    const products = await query.exec()

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'category')
      .populate('reviewTags', 'label isActive')

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    // Debug: Log the populated reviewTags
    console.log('Product reviewTags after populate:', product.reviewTags)
    console.log('ReviewTags type:', typeof product.reviewTags)
    console.log('ReviewTags length:', product.reviewTags?.length)

    res.status(200).json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error('Error in getProduct:', error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params
    const { limit } = req.query

    let query = Product.find({ category: categoryId })
      .populate('category', 'category')
      .populate('reviewTags', 'label isActive')

    const lim = limit != null ? parseInt(limit, 10) : 3 // default to 3 for category sections
    if (!Number.isNaN(lim) && lim > 0) {
      query = query.limit(lim)
    }

    const products = await query.exec()

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


exports.getProductsByCategoryPaginated = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query; 

    
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    
    const skip = (pageNumber - 1) * limitNumber;

  
    const total = await Product.countDocuments({ category: categoryId });

  
    const products = await Product.find({ category: categoryId })
      .populate("category", "category")
      .populate("reviewTags", "label isActive")
      .skip(skip)
      .limit(limitNumber)
      .exec();

    res.status(200).json({
      success: true,
      total, 
      page: pageNumber,
      pages: Math.ceil(total / limitNumber), 
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    console.log('Update request body:', req.body)
    console.log('Update request files:', req.files)

    const productData = req.body

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => {
        return file.location || `/uploads/${file.filename}`
      })

      if (productData.existingImages) {
        let existingImages = []
        try {
          existingImages = Array.isArray(productData.existingImages)
            ? productData.existingImages
            : JSON.parse(productData.existingImages)
        } catch (error) {
          console.error('Error parsing existingImages:', error)
          existingImages = productData.existingImages
            .split(',')
            .map((img) => img.trim())
        }

        productData.images = [...existingImages, ...newImages]
        delete productData.existingImages
      } else {
        productData.images = newImages
      }
    }

    if (typeof productData.tags === 'string') {
      try {
        productData.tags = JSON.parse(productData.tags)
      } catch (error) {
        console.error('Error parsing tags:', error)
        productData.tags = productData.tags.split(',').map((tag) => tag.trim())
      }
    }

    if (typeof productData.description === 'string') {
      try {
        productData.description = JSON.parse(productData.description)
      } catch (error) {
        console.error('Error parsing description:', error)

        const existingProduct = await Product.findById(req.params.id)
        if (existingProduct) {
          productData.description = {
            main: productData.description,
            details: existingProduct.description.details,
          }
        } else {
          productData.description = {
            main: productData.description,
            details: '',
          }
        }
      }
    }

    // Normalize stock/hasStock if provided
    if (productData.stock != null) {
      productData.stock = Number(productData.stock) || 0
      productData.hasStock = productData.stock > 0
    }

    // Parse reviewTags (array of ObjectId strings) if provided
    if (productData.reviewTags) {
      try {
        if (typeof productData.reviewTags === 'string') {
          const parsed = JSON.parse(productData.reviewTags)
          productData.reviewTags = Array.isArray(parsed) ? parsed : []
        }
      } catch (e) {
        productData.reviewTags = String(productData.reviewTags)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true },
    )

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    res.status(200).json({
      success: true,
      data: product,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    if (product.images && product.images.length > 0) {
      product.images.forEach((imagePath) => {
        if (!imagePath.startsWith('http')) {
          const fullPath = path.join(__dirname, '../..', imagePath)
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath)
          }
        }
      })
    }

    await product.deleteOne()

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

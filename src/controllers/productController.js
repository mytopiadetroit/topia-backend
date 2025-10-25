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

    // Ensure intensity is a number with default value 5
    if (productData.intensity) {
      productData.intensity = Number(productData.intensity)
    } else {
      productData.intensity = 5 // Default value if not provided
    }

    // Parse variants if provided
    if (productData.variants) {
      try {
        if (typeof productData.variants === 'string') {
          productData.variants = JSON.parse(productData.variants)
        }
        // Ensure each variant has proper types
        if (Array.isArray(productData.variants)) {
          productData.variants = productData.variants.map(v => ({
            size: {
              value: Number(v.size?.value || v.sizeValue || 0),
              unit: v.size?.unit || v.unit || 'grams',
            },
            price: Number(v.price || 0),
            stock: Number(v.stock || 0),
            sku: v.sku ? String(v.sku).trim() : undefined,
          }))
        }
      } catch (error) {
        console.error('Error parsing variants:', error)
        productData.variants = []
      }
    }

    // Parse flavors if provided
    if (productData.flavors) {
      try {
        if (typeof productData.flavors === 'string') {
          productData.flavors = JSON.parse(productData.flavors)
        }
        if (Array.isArray(productData.flavors)) {
          productData.flavors = productData.flavors.map(f => ({
            name: String(f.name || '').trim(),
            price: Number(f.price || 0),
          })).filter(f => f.name)
        }
      } catch (error) {
        console.error('Error parsing flavors:', error)
        productData.flavors = []
      }
    }

    // Set hasVariants flag
    if (productData.hasVariants === 'true' || productData.hasVariants === true) {
      productData.hasVariants = true
    } else if (productData.hasVariants === 'false' || productData.hasVariants === false) {
      productData.hasVariants = false
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
    const { categoryId, limit, page = 1, pageSize = 15 } = req.query;
    let filter = {};
    
    if (categoryId) {
      filter.category = categoryId;
    }
    
    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSizeNum = parseInt(pageSize, 10) || 15;
    const skip = (pageNum - 1) * pageSizeNum;
    
    let query = Product.find(filter)
      .populate('category', 'category')
      .populate('reviewTags', 'label isActive');
    
   
    if (limit) {
      const lim = Math.max(0, parseInt(limit, 10) || 0);
      if (lim > 0) {
        query = query.limit(lim);
      }
    } else {
      
      query = query.skip(skip).limit(pageSizeNum);
    }
    
    const products = await query.exec();
    
    // Get total count for pagination
    const totalCount = await Product.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      pagination: {
        currentPage: pageNum,
        pageSize: pageSizeNum,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pageSizeNum)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

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
    const { page = 1, limit = 10 } = req.query
    
    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)
    const skip = (pageNumber - 1) * limitNumber

    // Get total count of products in this category
    const total = await Product.countDocuments({ category: categoryId })

    let query = Product.find({ category: categoryId })
      .populate('category', 'category')
      .populate('reviewTags', 'label isActive')
      .sort({ order: 1 }) // Sort by order field in ascending order
      .skip(skip)
      .limit(limitNumber)
      
    console.log(`Fetching products for category ${categoryId}, page ${pageNumber}, limit ${limitNumber}`)

    const products = await query.exec()
    const totalPages = Math.ceil(total / limitNumber)

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNumber,
      totalPages,
      data: products,
    })
  } catch (error) {
    console.error('Error fetching products by category:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching products by category',
      error: error.message,
    })
  }
}


exports.getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params
    const { limit = 4 } = req.query

    // First get the current product to find its category
    const currentProduct = await Product.findById(id)

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    // Find related products in the same category, excluding current product
    const relatedProducts = await Product.find({
      category: currentProduct.category,
      _id: { $ne: id }, // Exclude current product
      hasStock: true // Only show products that are in stock
    })
      .populate('category', 'category')
      .populate('reviewTags', 'label isActive')
      .sort({ order: 1 }) // Sort by order field in ascending order
      .limit(parseInt(limit, 10))

    res.status(200).json({
      success: true,
      count: relatedProducts.length,
      data: relatedProducts,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

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

    // Parse variants if provided
    if (productData.variants) {
      try {
        if (typeof productData.variants === 'string') {
          productData.variants = JSON.parse(productData.variants)
        }
        // Ensure each variant has proper types
        if (Array.isArray(productData.variants)) {
          productData.variants = productData.variants.map(v => ({
            size: {
              value: Number(v.size?.value || v.sizeValue || 0),
              unit: v.size?.unit || v.unit || 'grams',
            },
            price: Number(v.price || 0),
            stock: Number(v.stock || 0),
            sku: v.sku ? String(v.sku).trim() : undefined,
          }))
        }
      } catch (error) {
        console.error('Error parsing variants:', error)
      }
    }

    // Parse flavors if provided
    if (productData.flavors) {
      try {
        if (typeof productData.flavors === 'string') {
          productData.flavors = JSON.parse(productData.flavors)
        }
        if (Array.isArray(productData.flavors)) {
          productData.flavors = productData.flavors.map(f => ({
            name: String(f.name || '').trim(),
            price: Number(f.price || 0),
          })).filter(f => f.name)
        }
      } catch (error) {
        console.error('Error parsing flavors:', error)
      }
    }

    // Set hasVariants flag
    if (productData.hasVariants === 'true' || productData.hasVariants === true) {
      productData.hasVariants = true
    } else if (productData.hasVariants === 'false' || productData.hasVariants === false) {
      productData.hasVariants = false
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


exports.updateProductOrder = async (req, res) => {
  console.log('=== UPDATE PRODUCT ORDER REQUEST ===');
  console.log('Product ID:', req.params.productId);
  console.log('New Order:', req.body.order);
  
  try {
    const { productId } = req.params;
    const { order } = req.body;

    if (order === undefined || order === null) {
      console.log('Error: Order value is required');
      return res.status(400).json({
        success: false,
        message: 'Order value is required',
      });
    }

    console.log(`Updating product ${productId} order to ${order}`);
    
    const product = await Product.findByIdAndUpdate(
      productId,
      { order: Number(order) },
      { new: true, runValidators: true }
    );

    if (!product) {
      console.log(`Error: Product ${productId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    console.log('Product order updated successfully:', product);
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error updating product order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product order',
      error: error.message,
    });
  }
};

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

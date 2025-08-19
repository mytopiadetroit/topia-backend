const Product = require('../models/Product');
const path = require('path');
const fs = require('fs');
const upload = require('../middlewares/upload');


exports.upload = upload;


exports.createProduct = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    
    const productData = req.body;
  
    if (req.files && req.files.length > 0) {
  
      productData.images = req.files.map(file => {
       
        return file.location || `/uploads/${file.filename}`;
      });
    }

    if (typeof productData.tags === 'string') {
      try {
        productData.tags = JSON.parse(productData.tags);
      } catch (error) {
        console.error('Error parsing tags:', error);
        productData.tags = productData.tags.split(',').map(tag => tag.trim());
      }
    }

 
    if (typeof productData.description === 'string') {
      try {
        productData.description = JSON.parse(productData.description);
      } catch (error) {
        console.error('Error parsing description:', error);
        
        productData.description = {
          main: productData.description,
          details: ''
        };
      }
    }

    // Normalize stock/hasStock
    if (productData.stock != null) {
      productData.stock = Number(productData.stock) || 0;
      productData.hasStock = productData.stock > 0;
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


exports.getAllProducts = async (req, res) => {
  try {
    const { categoryId } = req.query;
    let filter = {};
    
    if (categoryId) {
      filter.category = categoryId;
    }
    
    const products = await Product.find(filter).populate('category', 'category');
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'category');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const products = await Product.find({ category: categoryId }).populate('category', 'category');
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    console.log('Update request body:', req.body);
    console.log('Update request files:', req.files);
    
    const productData = req.body;
    
  
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => {
        return file.location || `/uploads/${file.filename}`;
      });
      
    
      if (productData.existingImages) {
        let existingImages = [];
        try {
          existingImages = Array.isArray(productData.existingImages) 
            ? productData.existingImages 
            : JSON.parse(productData.existingImages);
        } catch (error) {
          console.error('Error parsing existingImages:', error);
          existingImages = productData.existingImages.split(',').map(img => img.trim());
        }
        
        productData.images = [...existingImages, ...newImages];
        delete productData.existingImages;
      } else {
        productData.images = newImages;
      }
    }

  
    if (typeof productData.tags === 'string') {
      try {
        productData.tags = JSON.parse(productData.tags);
      } catch (error) {
        console.error('Error parsing tags:', error);
        productData.tags = productData.tags.split(',').map(tag => tag.trim());
      }
    }

    
    if (typeof productData.description === 'string') {
      try {
        productData.description = JSON.parse(productData.description);
      } catch (error) {
        console.error('Error parsing description:', error);
      
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct) {
          productData.description = {
            main: productData.description,
            details: existingProduct.description.details
          };
        } else {
          productData.description = {
            main: productData.description,
            details: ''
          };
        }
      }
    }

    // Normalize stock/hasStock if provided
    if (productData.stock != null) {
      productData.stock = Number(productData.stock) || 0;
      productData.hasStock = productData.stock > 0;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

   
    if (product.images && product.images.length > 0) {
      product.images.forEach(imagePath => {
    
        if (!imagePath.startsWith('http')) {
          const fullPath = path.join(__dirname, '../..', imagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
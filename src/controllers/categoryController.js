const mongoose = require('mongoose');
const Category = require('../models/Category');
const upload = require('../middlewares/upload');

module.exports = {
  upload,
  createCategory: async (req, res) => {
    try {
     
      const { category, metaTitle, metaDescription } = req.body;

      if (!category) {
        return res
          .status(400)
          .json({ success: false, message: 'Category name is required' });
      }

      const existing = await Category.findOne({ category });
      if (existing) {
        return res
          .status(400)
          .json({ success: false, message: 'Category already exists' });
      }

      const categoryData = {
        category,
        metaTitle: metaTitle || '',
        metaDescription: metaDescription || '',
      };

      
      if (req.file) {
        categoryData.image = req.file.location || `/uploads/${req.file.filename}`;
      }

      const newCategory = new Category(categoryData);
      await newCategory.save();

      res.status(201).json({
        success: true,
        message: 'Category created',
        data: newCategory,
      })
    } catch (error) {
      console.error('Error in createCategory:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  editCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { category, metaTitle, metaDescription } = req.body;

      const categoryDoc = await Category.findById(id);
      if (!categoryDoc) {
        return res
          .status(404)
          .json({ success: false, message: 'Category not found' });
      }

      // Check if category name is being changed to an existing one
      if (category && category !== categoryDoc.category) {
        const existing = await Category.findOne({ category });
        if (existing) {
          return res
            .status(400)
            .json({ success: false, message: 'Category already exists' });
        }
        categoryDoc.category = category;
      }

     
      if (req.file) {
       
        if (categoryDoc.image && !categoryDoc.image.startsWith('http')) {
          const fs = require('fs');
          const path = require('path');
          const imagePath = path.join(__dirname, '..', '..', categoryDoc.image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
        categoryDoc.image = req.file.location || `/uploads/${req.file.filename}`;
      }

      if (metaTitle !== undefined) categoryDoc.metaTitle = metaTitle;
      if (metaDescription !== undefined) categoryDoc.metaDescription = metaDescription;
      await categoryDoc.save();

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: categoryDoc,
      })
    } catch (error) {
      console.error('Error in editCategory:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  deleteCategory: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { id } = req.params;

     
      const category = await Category.findById(id).session(session);
      if (!category) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
      }

   
      const Product = require('../models/Product');
      const deleteResult = await Product.deleteMany({ 
        category: id 
      }).session(session);
      
      console.log(`Deleted ${deleteResult.deletedCount} products in category ${category.category}`);

      
      if (category.image && !category.image.startsWith('http')) {
        const fs = require('fs');
        const path = require('path');
        const imagePath = path.join(__dirname, '..', '..', category.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      
      await category.deleteOne({ session });
      
     
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ 
        success: true, 
        message: `Category and ${deleteResult.deletedCount} associated products deleted successfully` 
      });
    } catch (error) {
      console.error('Error in deleteCategory:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  getAllCategories: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const query = {}
      if (search) {
        query.category = { $regex: search, $options: 'i' }
      }

      const categories = await Category.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })

     
      const categoriesWithFullImageUrls = categories.map(category => {
        const categoryObj = category.toObject()
        if (categoryObj.image && !categoryObj.image.startsWith('http')) {
          categoryObj.image = `${req.protocol}://${req.get('host')}${categoryObj.image}`
        }
        return categoryObj
      })

      const total = await Category.countDocuments(query)

      res.status(200).json({
        success: true,
        data: categoriesWithFullImageUrls,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
          itemsPerPage: parseInt(limit)
        }
      })
    } catch (error) {
      console.error('Error in getAllCategories:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },
}

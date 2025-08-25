const Category = require('../models/Category')

module.exports = {
  createCategory: async (req, res) => {
    try {
      const { category, metaTitle, metaDescription } = req.body

      if (!category) {
        return res
          .status(400)
          .json({ success: false, message: 'Category name is required' })
      }

      const existing = await Category.findOne({ category })
      if (existing) {
        return res
          .status(400)
          .json({ success: false, message: 'Category already exists' })
      }

      const newCategory = new Category({
        category,
        metaTitle: metaTitle || '',
        metaDescription: metaDescription || '',
      })
      await newCategory.save()

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
      const { id } = req.params
      const { category, metaTitle, metaDescription } = req.body

      const categoryDoc = await Category.findById(id)
      if (!categoryDoc) {
        return res
          .status(404)
          .json({ success: false, message: 'Category not found' })
      }

      // Update fields
      categoryDoc.category = category || categoryDoc.category
      categoryDoc.metaTitle =
        metaTitle !== undefined ? metaTitle : categoryDoc.metaTitle
      categoryDoc.metaDescription =
        metaDescription !== undefined
          ? metaDescription
          : categoryDoc.metaDescription

      await categoryDoc.save()

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
    try {
      const { id } = req.params

      const deletedCategory = await Category.findByIdAndDelete(id)
      if (!deletedCategory) {
        return res
          .status(404)
          .json({ success: false, message: 'Category not found' })
      }

      res
        .status(200)
        .json({ success: true, message: 'Category deleted successfully' })
    } catch (error) {
      console.error('Error in deleteCategory:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  getAllCategories: async (req, res) => {
    try {
      const search = req.query.search || ''
      const page = parseInt(req.query.page) || 1
      const limit = 15
      const skip = (page - 1) * limit

      let filter = {}

      if (search.trim()) {
        filter = {
          category: { $regex: search, $options: 'i' },
        }
      }

      const totalCategories = await Category.countDocuments(filter)
      const totalPages = Math.ceil(totalCategories / limit)

      const categories = await Category.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })

      res.status(200).json({
        success: true,
        message: search.trim()
          ? 'Search results fetched successfully'
          : 'Categories fetched successfully',
        data: categories,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalCategories,
          itemsPerPage: limit,
        },
      })
    } catch (error) {
      console.error('Error in getAllCategories:', error)
      res.status(500).json({ success: false, message: error.message })
    }


  },
}



const Category = require("../models/Category");
module.exports = {

 createCategory: async (req, res) => {
    try {
      const { category } = req.body;

      if (!category) {
        return res
          .status(400)
          .json({ success: false, message: "Category name is required" });
      }

      const existing = await Category.findOne({ category });
      if (existing) {
        return res
          .status(400)
          .json({ success: false, message: "Category already exists" });
      }

      const newFood = new Category({ category });
      await newFood.save();

      res
        .status(201)
        .json({ success: true, message: "Category created", data: newFood });
    } catch (error) {
      console.error("Error in createCategory:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
  editCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { category } = req.body;

      const food = await Category.findById(id);
      if (!food) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      food.category = category || food.category;
      await food.save();

      res
        .status(200)
        .json({
          success: true,
          message: "Category updated successfully",
          data: food,
        });
    } catch (error) {
      console.error("Error in editCategory:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const deletedCategory = await Category.findByIdAndDelete(id);
      if (!deletedCategory) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      res
        .status(200)
        .json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error in deleteCategory:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

getAllCategories: async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    // Create search filter
    let filter = {};
    
    if (search.trim()) {
      filter = {
        category: { $regex: search, $options: "i" }
      };
    }

    // Get total count with filter
    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);

    // Get categories with pagination and filter
    const categories = await Category.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: search.trim() ? "Search results fetched successfully" : "Categories fetched successfully",
      data: categories,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalCategories,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}


}
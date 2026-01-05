const Deal = require('../models/Deal');
const Product = require('../models/Product');

// Get all active deals
const getActiveDeals = async (req, res) => {
  try {
    const now = new Date();
    const deals = await Deal.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate({
        path: 'dealItems.product',
        populate: {
          path: 'reviewTags',
          model: 'ReviewTag'
        }
      })
      .populate({
        path: 'products',
        populate: {
          path: 'reviewTags',
          model: 'ReviewTag'
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: deals,
    });
  } catch (error) {
    console.error('Error fetching active deals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active deals',
      error: error.message,
    });
  }
};

// Get deal by ID
const getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('products')
      .populate('dealItems.product');

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found',
      });
    }

    res.json({
      success: true,
      data: deal,
    });
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deal',
      error: error.message,
    });
  }
};

// Get banner deal (for floating banner)
const getBannerDeal = async (req, res) => {
  try {
    const now = new Date();
    const deal = await Deal.findOne({
      isActive: true,
      showBanner: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('products')
      .populate('dealItems.product')
      .sort({ createdAt: -1 });

    if (!deal) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: deal,
    });
  } catch (error) {
    console.error('Error fetching banner deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching banner deal',
      error: error.message,
    });
  }
};

// Admin: Get all deals
const getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.find()
      .populate('products')
      .populate('dealItems.product')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: deals,
    });
  } catch (error) {
    console.error('Error fetching all deals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deals',
      error: error.message,
    });
  }
};

// Admin: Create deal
const createDeal = async (req, res) => {
  try {
    const {
      title,
      description,
      discountType,
      discountPercentage,
      discountAmount,
      startDate,
      endDate,
      products,
      dealItems,
      isActive,
      showBanner,
      bannerInterval,
    } = req.body;

    // Get banner image from uploaded file
    let bannerImage = '';
    if (req.file) {
      bannerImage = req.file.location || `/uploads/${req.file.filename}`;
    }

    if (!bannerImage) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required',
      });
    }

    // Validate discount based on type
    const dealDiscountType = discountType || 'percentage';
    if (dealDiscountType === 'percentage' && !discountPercentage) {
      return res.status(400).json({
        success: false,
        message: 'Discount percentage is required for percentage type deals',
      });
    }
    if (dealDiscountType === 'fixed' && !discountAmount) {
      return res.status(400).json({
        success: false,
        message: 'Discount amount is required for fixed amount deals',
      });
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    // Parse products if it's a string
    const parsedProducts = typeof products === 'string' ? JSON.parse(products) : products || [];
    const parsedDealItems = typeof dealItems === 'string' ? JSON.parse(dealItems) : dealItems || [];

    const dealData = {
      title,
      description,
      bannerImage,
      discountType: dealDiscountType,
      startDate,
      endDate,
      products: parsedProducts,
      dealItems: parsedDealItems,
      isActive: isActive === 'true' || isActive === true,
      showBanner: showBanner === 'true' || showBanner === true,
      bannerInterval: parseInt(bannerInterval) || 30,
    };

    // Add discount value based on type
    if (dealDiscountType === 'percentage') {
      dealData.discountPercentage = parseFloat(discountPercentage);
    } else {
      dealData.discountAmount = parseFloat(discountAmount);
    }

    const deal = await Deal.create(dealData);

    const populatedDeal = await Deal.findById(deal._id)
      .populate('products')
      .populate('dealItems.product');

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      data: populatedDeal,
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating deal',
      error: error.message,
    });
  }
};

// Admin: Update deal
const updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get banner image from uploaded file if provided
    if (req.file) {
      updateData.bannerImage = req.file.location || `/uploads/${req.file.filename}`;
    }

    // Validate dates if provided
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date',
        });
      }
    }

    // Parse products if it's a string
    if (updateData.products && typeof updateData.products === 'string') {
      updateData.products = JSON.parse(updateData.products);
    }

    // Parse dealItems if it's a string
    if (updateData.dealItems && typeof updateData.dealItems === 'string') {
      updateData.dealItems = JSON.parse(updateData.dealItems);
    }

    // Parse boolean values
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
    }
    if (updateData.showBanner !== undefined) {
      updateData.showBanner = updateData.showBanner === 'true' || updateData.showBanner === true;
    }
    if (updateData.bannerInterval) {
      updateData.bannerInterval = parseInt(updateData.bannerInterval);
    }
    if (updateData.discountPercentage) {
      updateData.discountPercentage = parseFloat(updateData.discountPercentage);
    }

    const deal = await Deal.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('products')
      .populate('dealItems.product');

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found',
      });
    }

    res.json({
      success: true,
      message: 'Deal updated successfully',
      data: deal,
    });
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating deal',
      error: error.message,
    });
  }
};

// Admin: Delete deal
const deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findByIdAndDelete(id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found',
      });
    }

    res.json({
      success: true,
      message: 'Deal deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting deal',
      error: error.message,
    });
  }
};

module.exports = {
  getActiveDeals,
  getDealById,
  getBannerDeal,
  getAllDeals,
  createDeal,
  updateDeal,
  deleteDeal,
};
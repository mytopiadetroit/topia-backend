const ReviewOption = require('../models/ReviewOption');
const ReviewResponse = require('../models/ReviewResponse');

exports.createReviewOption = async (req, res) => {
  try {
    const { label, emoji = '', isActive = true } = req.body || {};
    if (!label) return res.status(400).json({ success: false, message: 'Label is required' });
    const option = await ReviewOption.create({ label, emoji, isActive });
    return res.status(201).json({ success: true, data: option });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getReviewOptions = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (typeof active !== 'undefined') filter.isActive = active === 'true' || active === true;
    const options = await ReviewOption.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: options });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReviewOptionById = async (req, res) => {
  try {
    const option = await ReviewOption.findById(req.params.id);
    if (!option) return res.status(404).json({ success: false, message: 'Option not found' });
    return res.status(200).json({ success: true, data: option });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateReviewOption = async (req, res) => {
  try {
    const { label, emoji, isActive } = req.body || {};
    const option = await ReviewOption.findByIdAndUpdate(
      req.params.id,
      { label, emoji, isActive },
      { new: true, runValidators: true }
    );
    if (!option) return res.status(404).json({ success: false, message: 'Option not found' });
    return res.status(200).json({ success: true, data: option });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteReviewOption = async (req, res) => {
  try {
    const option = await ReviewOption.findByIdAndDelete(req.params.id);
    if (!option) return res.status(404).json({ success: false, message: 'Option not found' });
    return res.status(200).json({ success: true, message: 'Option deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.submitReviewResponse = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { productId, optionId, orderId } = req.body || {};
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!productId || !optionId) return res.status(400).json({ success: false, message: 'productId and optionId are required' });

    const option = await ReviewOption.findById(optionId);
    if (!option || !option.isActive) return res.status(400).json({ success: false, message: 'Invalid or inactive option' });

    // Upsert: if a review by this user for this product (and order if provided) exists, update it; else create.
    const filter = { user: userId, product: productId };
    if (orderId) filter.order = orderId;

    const update = {
      user: userId,
      product: productId,
      option: optionId,
      label: option.label,
      emoji: option.emoji,
      order: orderId || undefined
    };

    const response = await ReviewResponse.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: true });

    return res.status(201).json({ success: true, data: response });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Aggregated counts of review options for a product: returns top N (default 5)
exports.getProductReviewAggregates = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = Number(req.query.limit || 5);
    const pipeline = [
      { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(productId) } },
      { $group: { _id: '$option', count: { $sum: 1 }, label: { $last: '$label' }, emoji: { $last: '$emoji' } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ];
    const results = await ReviewResponse.aggregate(pipeline);
    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Get the current user's review for a product (optionally scoped to an order)
exports.getMyReviewForProduct = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { productId, orderId } = req.query || {};
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });

    const baseFilter = { user: userId, product: productId };
    const filter = orderId ? { ...baseFilter, order: orderId } : baseFilter;

    let doc = await ReviewResponse.findOne(filter).select('-__v');
    // Fallback: if not found with order filter, try without order (legacy reviews)
    if (!doc && orderId) {
      doc = await ReviewResponse.findOne(baseFilter).select('-__v');
    }
    if (!doc) return res.status(200).json({ success: true, data: null });
    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};



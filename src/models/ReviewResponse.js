const mongoose = require('mongoose');

const ReviewResponseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  option: { type: mongoose.Schema.Types.ObjectId, ref: 'ReviewOption', required: true },
  // snapshot fields for label at the time of submission (optional but helpful)
  label: { type: String, default: '' },
  emoji: { type: String, default: '' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: true });

// ensure a user can submit multiple reviews but we may dedupe later if needed

module.exports = mongoose.model('ReviewResponse', ReviewResponseSchema);



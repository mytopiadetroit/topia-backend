const mongoose = require('mongoose');

const ReviewResponseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  option: { type: mongoose.Schema.Types.ObjectId, ref: 'ReviewOption', required: true },
  
  label: { type: String, default: '' },
  emoji: { type: String, default: '' },
  order: { type: String, ref: 'Order' },
}, { timestamps: true });



module.exports = mongoose.model('ReviewResponse', ReviewResponseSchema);



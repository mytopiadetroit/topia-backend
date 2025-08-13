const mongoose = require('mongoose');

const loginEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

loginEventSchema.index({ createdAt: 1 });
loginEventSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('LoginEvent', loginEventSchema);



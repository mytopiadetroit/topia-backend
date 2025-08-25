const Wishlist = require('../models/Wishlist')
const Product = require('../models/Product')

module.exports = {
  // GET /api/wishlist
  getWishlist: async (req, res) => {
    try {
      const userId = req.user.id || req.user._id
      const wishlist = await Wishlist.findOne({ user: userId }).populate(
        'items',
      )
      return res.json({ success: true, data: wishlist ? wishlist.items : [] })
    } catch (err) {
      console.error('getWishlist error:', err)
      return res
        .status(500)
        .json({ success: false, message: 'Failed to fetch wishlist' })
    }
  },

  // POST /api/wishlist/:productId
  addToWishlist: async (req, res) => {
    try {
      const userId = req.user.id || req.user._id
      const { productId } = req.params

      // Ensure product exists
      const product = await Product.findById(productId)
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: 'Product not found' })
      }

      const wishlist = await Wishlist.findOneAndUpdate(
        { user: userId },
        { $addToSet: { items: productId } },
        { new: true, upsert: true },
      ).populate('items')

      return res.json({ success: true, data: wishlist.items })
    } catch (err) {
      console.error('addToWishlist error:', err)
      return res
        .status(500)
        .json({ success: false, message: 'Failed to add to wishlist' })
    }
  },

  // DELETE /api/wishlist/:productId
  removeFromWishlist: async (req, res) => {
    try {
      const userId = req.user.id || req.user._id
      const { productId } = req.params

      const wishlist = await Wishlist.findOneAndUpdate(
        { user: userId },
        { $pull: { items: productId } },
        { new: true },
      ).populate('items')

      return res.json({ success: true, data: wishlist ? wishlist.items : [] })
    } catch (err) {
      console.error('removeFromWishlist error:', err)
      return res
        .status(500)
        .json({ success: false, message: 'Failed to remove from wishlist' })
    }
  },
}

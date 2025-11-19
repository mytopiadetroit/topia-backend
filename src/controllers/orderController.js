const Order = require('../models/Order')
const User = require('../models/User')
const Product = require('../models/Product')

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body
    const userId = req.user.id // From auth middleware

    // Validate user exists
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    // Calculate totals
    const subtotal = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    )
    const tax = subtotal * 0.07 // 7% tax
    const totalAmount = subtotal + tax

    // Reserve stock before creating order
    for (const item of items) {
      const productId = item._id || item.id || item.product
      if (!productId) continue
      const product = await Product.findById(productId)
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found for item ${item.name || ''}`,
        })
      }
      const requested = Number(item.quantity || 1)
      if (product.stock != null) {
        if (product.stock < requested) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`,
          })
        }
        product.stock = product.stock - requested
        product.hasStock = product.stock > 0
        await product.save()
      }
    }

    // Create order (pickup flow)
    const order = new Order({
      user: userId,
      items: items.map((item) => ({
        product: item._id || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.images && item.images.length > 0 ? item.images[0] : null,
      })),
      subtotal,
      tax,
      totalAmount,
      shippingAddress,
      paymentMethod: paymentMethod || 'pay_at_pickup',
      notes,
    })

    await order.save()

    // Populate product details for response
    await order.populate('items.product', 'name price images')

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    // In case of failure after reserving stock, we could add compensation, but we lack context of which items processed; skipping for now
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get order by ID
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name price images')

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      })
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get all orders for a user
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id

    const orders = await Order.find({ user: userId })
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get all orders (admin only) with pagination and optional status filter
exports.getAllOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1)
    const status =
      req.query.status && req.query.status !== 'all'
        ? req.query.status
        : undefined

    const criteria = {}
    if (status) criteria.status = status
    if (req.query.userid) criteria.user = req.query.userid
    console.log(criteria)
    const total = await Order.countDocuments(criteria)
    const totalPages = Math.ceil(total / limit) || 1
    const skip = (page - 1) * limit

    const orders = await Order.find(criteria)
      .populate('user', 'fullName email')
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
      meta: { page, limit, total, totalPages },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Update order status (admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body
    const orderId = req.params.id

    const prev = await Order.findById(orderId)
    if (!prev) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' })
    }

    // If moving to incomplete or unfulfilled from a non-refunded state, revert stock; if moving to fulfilled, keep stock deducted
    const shouldRevert = ['unfulfilled', 'incomplete'].includes(status)
    const wasPending =
      prev.status === 'pending' || prev.status === 'unfulfilled'

    const updated = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true },
    ).populate('user', 'fullName email')

    if (shouldRevert && wasPending) {
      for (const item of prev.items || []) {
        const product = await Product.findById(item.product)
        if (product && product.stock != null) {
          product.stock = product.stock + (item.quantity || 1)
          product.hasStock = product.stock > 0
          await product.save()
        }
      }
    }

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updated,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Delete order (admin only)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

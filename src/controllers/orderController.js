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
      
      // Check if item has a selected variant
      if (item.selectedVariant && item.selectedVariant._id) {
        const variant = product.variants.find(v => v._id.toString() === item.selectedVariant._id.toString())
        if (variant) {
          if (variant.stock < requested) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${product.name} (${variant.size?.value}${variant.size?.unit})`,
            })
          }
          variant.stock = variant.stock - requested
          await product.save()
          continue
        }
      }
      
      // Check if item has a selected flavor
      if (item.selectedFlavor && item.selectedFlavor._id) {
        const flavor = product.flavors.find(f => f._id.toString() === item.selectedFlavor._id.toString())
        if (flavor) {
          if (flavor.stock < requested) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${product.name} (${flavor.name})`,
            })
          }
          flavor.stock = flavor.stock - requested
          await product.save()
          continue
        }
      }
      
      // If no variant or flavor, deduct from main product stock
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

    // Log incoming items to check if variant/flavor data is present
    console.log('=== CREATE ORDER - INCOMING ITEMS ===');
    items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        name: item.name,
        selectedVariant: item.selectedVariant,
        selectedFlavor: item.selectedFlavor,
      });
    });
    console.log('====================================');

    // Create order (pickup flow)
    const order = new Order({
      user: userId,
      items: items.map((item) => ({
        product: item._id || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.images && item.images.length > 0 ? item.images[0] : null,
        selectedVariant: item.selectedVariant || null,
        selectedFlavor: item.selectedFlavor || null,
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

    console.log('=== ORDER SAVED ===');
    console.log('Saved Order Items:', order.items.map(item => ({
      name: item.name,
      selectedVariant: item.selectedVariant,
      selectedFlavor: item.selectedFlavor,
    })));
    console.log('===================');

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

    const criteria = { $or: [{ isArchived: false }, { isArchived: { $exists: false } }] } // Show non-archived and old data without field
    if (status) criteria.status = status
    if (req.query.userid) criteria.user = req.query.userid
    console.log(criteria)
    const total = await Order.countDocuments(criteria)
    const totalPages = Math.ceil(total / limit) || 1
    const skip = (page - 1) * limit

    const orders = await Order.find(criteria)
      .populate('user', 'fullName email phone')
      .populate('items.product', 'name price images variants flavors hasVariants')
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
        if (!product) continue
        
        const quantity = item.quantity || 1
        
        // Restore variant stock if applicable
        if (item.selectedVariant && item.selectedVariant._id) {
          const variant = product.variants.find(v => v._id.toString() === item.selectedVariant._id.toString())
          if (variant) {
            variant.stock = (variant.stock || 0) + quantity
            await product.save()
            continue
          }
        }
        
        // Restore flavor stock if applicable
        if (item.selectedFlavor && item.selectedFlavor._id) {
          const flavor = product.flavors.find(f => f._id.toString() === item.selectedFlavor._id.toString())
          if (flavor) {
            flavor.stock = (flavor.stock || 0) + quantity
            await product.save()
            continue
          }
        }
        
        // Restore main product stock
        if (product.stock != null) {
          product.stock = product.stock + quantity
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

// Cancel order (user can cancel their own order)
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the order by orderNumber and user
    const order = await Order.findOne({ orderNumber: id, user: userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to cancel this order',
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'unfulfilled', 'incomplete'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'This order cannot be cancelled as it has already been processed',
      });
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      
      const quantity = item.quantity || 1;
      
      // Restore variant stock if applicable
      if (item.selectedVariant && item.selectedVariant._id) {
        const variant = product.variants.find(v => v._id.toString() === item.selectedVariant._id.toString());
        if (variant) {
          variant.stock = (variant.stock || 0) + quantity;
          await product.save();
          continue;
        }
      }
      
      // Restore flavor stock if applicable
      if (item.selectedFlavor && item.selectedFlavor._id) {
        const flavor = product.flavors.find(f => f._id.toString() === item.selectedFlavor._id.toString());
        if (flavor) {
          flavor.stock = (flavor.stock || 0) + quantity;
          await product.save();
          continue;
        }
      }
      
      // Restore main product stock
      product.stock = (product.stock || 0) + quantity;
      product.hasStock = product.stock > 0;
      await product.save();
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    order.updatedAt = Date.now();
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order,
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message,
    });
  }
};

// Archive order (admin only - soft delete)
exports.archiveOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      })
    }

    order.isArchived = true
    await order.save()

    res.status(200).json({
      success: true,
      message: 'Order archived successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Unarchive order (admin only)
exports.unarchiveOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      })
    }

    order.isArchived = false
    await order.save()

    res.status(200).json({
      success: true,
      message: 'Order unarchived successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get archived orders (admin only)
exports.getArchivedOrders = async (req, res) => {
  try {
    const { page = 1, limit = 30, search = '', date = '', status = '' } = req.query

    const query = { isArchived: true }

    // Search by order number or customer name/phone
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { orderNumber: { $regex: escapedSearch, $options: 'i' } },
      ]
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status
    }

    // Filter by date (Michigan timezone)
    if (date) {
      const moment = require('moment-timezone')
      const michiganTz = 'America/Detroit'
      const selectedDate = moment.tz(date, michiganTz)
      const startOfDay = selectedDate.clone().startOf('day').toDate()
      const endOfDay = selectedDate.clone().endOf('day').toDate()
      query.createdAt = { $gte: startOfDay, $lte: endOfDay }
    }

    const orders = await Order.find(query)
      .populate('user', 'fullName email phone')
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const count = await Order.countDocuments(query)

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

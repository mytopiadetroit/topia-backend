const BoxPickup = require('../models/BoxPickup')
const Subscription = require('../models/Subscription')
const User = require('../models/User')

const createBoxPickup = async (req, res) => {
  try {
    const { userId, items, scheduledDate, notes } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      })
    }

    const subscription = await Subscription.findOne({ userId, status: 'active' })
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found for this user'
      })
    }

    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)

    const currentMonthEnd = new Date(currentMonthStart)
    currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1)

    const boxCountThisMonth = await BoxPickup.countDocuments({
      userId,
      createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd }
    })

    const boxPickup = new BoxPickup({
      userId,
      subscriptionId: subscription._id,
      boxNumber: boxCountThisMonth + 1,
      items: items || subscription.currentBoxItems || [],
      scheduledDate: scheduledDate || new Date(),
      notes
    })

    await boxPickup.save()

    res.status(201).json({
      success: true,
      message: 'Box pickup created successfully',
      data: boxPickup
    })
  } catch (error) {
    console.error('Error creating box pickup:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create box pickup',
      error: error.message
    })
  }
}

const getBoxPickups = async (req, res) => {
  try {
    const { userId, status, page = 1, limit = 50 } = req.query
    const query = {}

    if (userId) query.userId = userId
    if (status) query.status = status

    const boxPickups = await BoxPickup.find(query)
      .populate('userId', 'fullName email phone')
      .populate('subscriptionId', 'monthlyPrice status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await BoxPickup.countDocuments(query)

    res.json({
      success: true,
      data: boxPickups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching box pickups:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch box pickups'
    })
  }
}

const getUserBoxHistory = async (req, res) => {
  try {
    const { userId } = req.params

    const boxPickups = await BoxPickup.find({ userId })
      .sort({ createdAt: -1 })
      .populate('subscriptionId', 'monthlyPrice')

    const stats = {
      totalBoxes: boxPickups.length,
      pickedUp: boxPickups.filter(b => b.status === 'picked_up').length,
      pending: boxPickups.filter(b => b.status === 'pending').length
    }

    const monthlyBreakdown = {}
    boxPickups.forEach(box => {
      const monthKey = new Date(box.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      if (!monthlyBreakdown[monthKey]) {
        monthlyBreakdown[monthKey] = { total: 0, pickedUp: 0, pending: 0 }
      }
      monthlyBreakdown[monthKey].total++
      if (box.status === 'picked_up') monthlyBreakdown[monthKey].pickedUp++
      if (box.status === 'pending') monthlyBreakdown[monthKey].pending++
    })

    res.json({
      success: true,
      data: {
        history: boxPickups,
        stats,
        monthlyBreakdown
      }
    })
  } catch (error) {
    console.error('Error fetching user box history:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch box history'
    })
  }
}

const markBoxPickup = async (req, res) => {
  try {
    const { id } = req.params
    const { status, pickedUpBy, notes } = req.body

    if (!['pending', 'picked_up'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      })
    }

    const updateData = { status }
    if (status === 'picked_up') {
      updateData.pickedUpDate = new Date()
      if (pickedUpBy) updateData.pickedUpBy = pickedUpBy
    }
    if (notes) updateData.notes = notes

    const boxPickup = await BoxPickup.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('userId', 'fullName email phone')

    if (!boxPickup) {
      return res.status(404).json({
        success: false,
        message: 'Box pickup not found'
      })
    }

    res.json({
      success: true,
      message: `Box marked as ${status}`,
      data: boxPickup
    })
  } catch (error) {
    console.error('Error updating box pickup:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update box pickup'
    })
  }
}

const updateBoxPickup = async (req, res) => {
  try {
    const { id } = req.params
    const { items, scheduledDate, notes } = req.body

    const updateData = {}
    if (items) updateData.items = items
    if (scheduledDate) updateData.scheduledDate = scheduledDate
    if (notes !== undefined) updateData.notes = notes

    const boxPickup = await BoxPickup.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('userId', 'fullName email phone')

    if (!boxPickup) {
      return res.status(404).json({
        success: false,
        message: 'Box pickup not found'
      })
    }

    res.json({
      success: true,
      message: 'Box pickup updated successfully',
      data: boxPickup
    })
  } catch (error) {
    console.error('Error updating box pickup:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update box pickup'
    })
  }
}

module.exports = {
  createBoxPickup,
  getBoxPickups,
  getUserBoxHistory,
  markBoxPickup,
  updateBoxPickup
}

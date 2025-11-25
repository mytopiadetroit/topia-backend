const User = require('../models/User')
const PointsAdjustment = require('../models/PointsAdjustment')
const RewardTask = require('../models/RewardTask')

// Admin: Manually adjust user points
const adjustUserPoints = async (req, res) => {
  try {
    const { userId } = req.params
    const { adjustmentType, points, reason, rewardTaskId, customReason, notes } = req.body
    const adminId = req.user?.id

    // Validation
    if (!adjustmentType || !points || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment type, points, and reason are required',
      })
    }

    if (!['add', 'subtract'].includes(adjustmentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid adjustment type. Must be "add" or "subtract"',
      })
    }

    if (points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Points must be greater than 0',
      })
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const previousBalance = user.rewardPoints || 0
    let newBalance = previousBalance

    // Calculate new balance
    if (adjustmentType === 'add') {
      newBalance = previousBalance + points
    } else {
      newBalance = Math.max(0, previousBalance - points) // Don't go below 0
    }

    // Update user points
    user.rewardPoints = newBalance
    await user.save()

    // Create adjustment record
    const adjustment = new PointsAdjustment({
      user: userId,
      adjustedBy: adminId,
      adjustmentType,
      points,
      reason,
      rewardTask: rewardTaskId || null,
      customReason: customReason || '',
      previousBalance,
      newBalance,
      notes: notes || '',
    })

    await adjustment.save()

    // Populate the adjustment record
    const populatedAdjustment = await PointsAdjustment.findById(adjustment._id)
      .populate('user', 'fullName email')
      .populate('adjustedBy', 'fullName email')
      .populate('rewardTask', 'title taskId reward')

    res.json({
      success: true,
      message: `Points ${adjustmentType === 'add' ? 'added' : 'subtracted'} successfully`,
      data: {
        adjustment: populatedAdjustment,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          previousBalance,
          newBalance,
        },
      },
    })
  } catch (error) {
    console.error('Error adjusting points:', error)
    res.status(500).json({
      success: false,
      message: 'Error adjusting user points',
      error: error.message,
    })
  }
}

// Admin: Get user's points adjustment history
const getUserPointsHistory = async (req, res) => {
  try {
    const { userId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const adjustments = await PointsAdjustment.find({ user: userId })
      .populate('adjustedBy', 'fullName email')
      .populate('rewardTask', 'title taskId reward')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await PointsAdjustment.countDocuments({ user: userId })

    // Get user's current balance
    const user = await User.findById(userId).select('fullName email rewardPoints')

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          currentBalance: user.rewardPoints || 0,
        },
        adjustments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching points history:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching points history',
      error: error.message,
    })
  }
}

// Admin: Get all points adjustments
const getAllPointsAdjustments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const { search, type, userId, startDate, endDate } = req.query

    // Build filter query
    const filter = {}
    
    // Type filter
    if (type && type !== 'all') {
      filter.adjustmentType = type
    }
    
    // User filter
    if (userId) {
      filter.user = userId
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = endDateTime
      }
    }

    let adjustments = await PointsAdjustment.find(filter)
      .populate('user', 'fullName email')
      .populate('adjustedBy', 'fullName email')
      .populate('rewardTask', 'title taskId reward')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Search filter (applied after population)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search, 'i')
      adjustments = adjustments.filter(adj => 
        adj.user?.fullName?.match(searchRegex) ||
        adj.user?.email?.match(searchRegex) ||
        adj.reason?.match(searchRegex) ||
        adj.rewardTask?.title?.match(searchRegex)
      )
    }

    const total = await PointsAdjustment.countDocuments(filter)

    res.json({
      success: true,
      data: adjustments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    })
  } catch (error) {
    console.error('Error fetching adjustments:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching points adjustments',
      error: error.message,
    })
  }
}

// User: Get own points balance and history
const getMyPoints = async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    const user = await User.findById(userId).select('fullName email rewardPoints')

    // Get recent adjustments
    const adjustments = await PointsAdjustment.find({ user: userId })
      .populate('rewardTask', 'title taskId reward')
      .sort({ createdAt: -1 })
      .limit(10)

    res.json({
      success: true,
      data: {
        currentBalance: user.rewardPoints || 0,
        recentAdjustments: adjustments,
      },
    })
  } catch (error) {
    console.error('Error fetching user points:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching points',
      error: error.message,
    })
  }
}

// Admin: Get points statistics
const getPointsStats = async (req, res) => {
  try {
    const stats = await PointsAdjustment.aggregate([
      {
        $group: {
          _id: null,
          totalAdjustments: { $sum: 1 },
          totalPointsAdded: {
            $sum: {
              $cond: [{ $eq: ['$adjustmentType', 'add'] }, '$points', 0],
            },
          },
          totalPointsSubtracted: {
            $sum: {
              $cond: [{ $eq: ['$adjustmentType', 'subtract'] }, '$points', 0],
            },
          },
        },
      },
    ])

    // Get total users with points
    const usersWithPoints = await User.countDocuments({ rewardPoints: { $gt: 0 } })

    // Get total points in circulation
    const totalPointsResult = await User.aggregate([
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$rewardPoints' },
        },
      },
    ])

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalAdjustments: 0,
          totalPointsAdded: 0,
          totalPointsSubtracted: 0,
        },
        usersWithPoints,
        totalPointsInCirculation: totalPointsResult[0]?.totalPoints || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching points stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching points statistics',
      error: error.message,
    })
  }
}

module.exports = {
  adjustUserPoints,
  getUserPointsHistory,
  getAllPointsAdjustments,
  getMyPoints,
  getPointsStats,
}

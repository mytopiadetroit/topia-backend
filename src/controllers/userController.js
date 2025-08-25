const User = require('../models/User')
const LoginEvent = require('../models/LoginEvent')

// Get all users with pagination support
const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1)

    const totalUsers = await User.countDocuments({})
    const totalPages = Math.ceil(totalUsers / limit) || 1
    const skip = (page - 1) * limit

    const users = await User.find({})
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
      count: users.length,
      meta: {
        page,
        limit,
        total: totalUsers,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
}

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id).select('-__v')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
}

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-__v')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
}

// Update user status only (pending | suspend | verified)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body || {}
    const allowed = ['pending', 'suspend', 'verified']
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    ).select('-__v')

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    return res
      .status(200)
      .json({ success: true, message: 'Status updated', data: user })
  } catch (error) {
    console.error('Error updating user status:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' })
  }
}

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findByIdAndDelete(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    })
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
}

// Admin: get login stats for last 7 days including today
module.exports.getLoginStats = async (req, res) => {
  try {
    // Only admins should reach here (enforced in route)
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    // 7 days window start
    const sevenDaysAgo = new Date(start)
    sevenDaysAgo.setDate(start.getDate() - 6)

    const pipeline = [
      { $match: { createdAt: { $gte: sevenDaysAgo, $lte: new Date() } } },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
            d: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
    ]

    const raw = await LoginEvent.aggregate(pipeline)

    // Map to last 7 days array
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(start)
      d.setDate(start.getDate() - i)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      days.push({ key, date: d, count: 0 })
    }

    const map = new Map(
      raw.map((r) => [`${r._id.y}-${r._id.m}-${r._id.d}`, r.count]),
    )

    const result = days.map((d) => ({
      date: d.date,
      label: d.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      count: map.get(d.key) || 0,
    }))

    const today = result[result.length - 1]?.count || 0

    res.status(200).json({ success: true, today, last7Days: result })
  } catch (error) {
    console.error('Error fetching login stats:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Admin: generic login stats with range param: weekly (last 7 days), monthly (last 30 days by day), yearly (last 12 months by month)
module.exports.getLoginStatsRange = async (req, res) => {
  try {
    const range = String(req.query.range || 'weekly').toLowerCase()

    if (range === 'weekly') {
      return module.exports.getLoginStats(req, res)
    }

    if (range === 'monthly') {
      // last 30 days grouped by day
      const now = new Date()
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const windowStart = new Date(start)
      windowStart.setDate(start.getDate() - 29)

      const pipeline = [
        { $match: { createdAt: { $gte: windowStart, $lte: new Date() } } },
        {
          $group: {
            _id: {
              y: { $year: '$createdAt' },
              m: { $month: '$createdAt' },
              d: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
      ]

      const raw = await LoginEvent.aggregate(pipeline)

      const days = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(start)
        d.setDate(start.getDate() - i)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
        days.push({ key, date: d, count: 0 })
      }

      const map = new Map(
        raw.map((r) => [`${r._id.y}-${r._id.m}-${r._id.d}`, r.count]),
      )

      const result = days.map((d) => ({
        date: d.date,
        label: d.date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        count: map.get(d.key) || 0,
      }))

      const today = result[result.length - 1]?.count || 0
      const total = result.reduce((a, b) => a + (b.count || 0), 0)

      return res.status(200).json({
        success: true,
        today,
        range: 'monthly',
        series: result,
        total,
      })
    }

    if (range === 'yearly') {
      // last 12 months grouped by month
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const windowStart = new Date(start)
      windowStart.setMonth(start.getMonth() - 11)

      const pipeline = [
        { $match: { createdAt: { $gte: windowStart, $lte: new Date() } } },
        {
          $group: {
            _id: {
              y: { $year: '$createdAt' },
              m: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]

      const raw = await LoginEvent.aggregate(pipeline)

      const months = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(start)
        d.setMonth(start.getMonth() - i)
        months.push({
          y: d.getFullYear(),
          m: d.getMonth() + 1,
          date: d,
          count: 0,
        })
      }

      const map = new Map(raw.map((r) => [`${r._id.y}-${r._id.m}`, r.count]))

      const result = months.map((d) => ({
        date: d.date,
        label: d.date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        count: map.get(`${d.y}-${d.m}`) || 0,
      }))

      const thisMonth = result[result.length - 1]?.count || 0
      const total = result.reduce((a, b) => a + (b.count || 0), 0)

      return res.status(200).json({
        success: true,
        thisMonth,
        range: 'yearly',
        series: result,
        total,
      })
    }

    return res.status(400).json({ success: false, message: 'Invalid range' })
  } catch (error) {
    console.error('Error fetching login stats:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

const User = require('../models/User')
const LoginEvent = require('../models/LoginEvent')

// Get all users with pagination support
const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1)
    const { status, search, infiniteScroll } = req.query

    // Build query
    const query = {}
    
    // Status filter
    if (status && ['pending', 'suspend', 'verified', 'incomplete'].includes(status)) {
      query.status = status
    }
    
    // Search filter
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { fullName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { phone: { $regex: searchRegex } }
      ]
    }

    const totalUsers = await User.countDocuments(query)
    
    // For infinite scroll, we want to load more users but keep DOM rendering limited
    let actualLimit = limit
    let skip = (page - 1) * limit
    
    // If infinite scroll is enabled, adjust the logic
    if (infiniteScroll === 'true') {
      // For infinite scroll, we'll fetch 50 users per request
      actualLimit = 50
      skip = (page - 1) * 50
    }
    
    const totalPages = Math.ceil(totalUsers / actualLimit) || 1

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(actualLimit)

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
      count: users.length,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalUsers,
        itemsPerPage: actualLimit,
      },
      meta: {
        page,
        limit: actualLimit,
        total: totalUsers,
        totalPages,
        hasMore: skip + actualLimit < totalUsers,
        infiniteScroll: infiniteScroll === 'true'
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

    // Get visit count from Visitor model
    const Visitor = require('../models/Visitor');
    const visitorData = await Visitor.findOne({ userId: id });
    const visitCount = visitorData ? visitorData.visitCount : 0;
    const lastVisit = visitorData ? visitorData.lastVisit : null;

    // Add visit info to user data
    const userData = user.toObject();
    userData.visitCount = visitCount;
    userData.lastVisit = lastVisit;

    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: userData,
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
    const { status, reason = '', suspensionReason = '' } = req.body || {}
    
    console.log('🔍 Update Status Request:', { id, status, reason, suspensionReason })
    
    const allowed = ['pending', 'suspend', 'verified', 'incomplete']
    
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    // Get the user before updating to check status change
    const oldUser = await User.findById(id)
    if (!oldUser) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Prepare update data
    const updateData = { status }
    
    // If suspending, save the suspension reason
    if (status === 'suspend' && suspensionReason) {
      updateData.suspensionReason = suspensionReason
      console.log('✅ Adding suspensionReason to updateData:', suspensionReason)
    }
    
    // If changing from suspend to another status, clear suspension reason
    if (oldUser.status === 'suspend' && status !== 'suspend') {
      updateData.suspensionReason = ''
      console.log('🧹 Clearing suspensionReason')
    }

    console.log('📝 Update Data:', updateData)

    // Update user status
    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    ).select('-__v')
    
    console.log('✅ User updated:', { 
      id: user._id, 
      status: user.status, 
      suspensionReason: user.suspensionReason 
    })

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Import email service
    const { sendAccountSuspendedEmail, sendAccountVerifiedEmail } = require('../utils/emailService')

    // Send appropriate email based on status change
    if (oldUser.status !== status) {
      try {
        if (status === 'suspend') {
          const reasonToSend = suspensionReason || reason || 'Violation of terms of service'
          await sendAccountSuspendedEmail(user.email, user.fullName || 'User', reasonToSend)
          console.log(`Suspension email sent to ${user.email}`)
        } else if (status === 'verified' && oldUser.status !== 'verified') {
          await sendAccountVerifiedEmail(user.email, user.fullName || 'User')
          console.log(`Verification email sent to ${user.email}`)
        }
      } catch (emailError) {
        console.error('Error sending status update email:', emailError)
        // Don't fail the request if email fails, just log it
      }
    }

    return res
      .status(200)
      .json({ 
        success: true, 
        message: `Status updated to ${status}`,
        data: user 
      })
  } catch (error) {
    console.error('Error updating user status:', error)
    return res
      .status(500)
      .json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      })
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

// Update SMS preferences (opt-in/opt-out)
const updateSMSPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { smsOptOut } = req.body;

    // Validate input
    if (typeof smsOptOut !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'smsOptOut must be a boolean value'
      });
    }

    // Find and update user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update SMS preferences
    user.smsOptOut = smsOptOut;
    if (smsOptOut) {
      user.smsOptOutDate = new Date();
    } else {
      user.smsOptOutDate = undefined;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: smsOptOut ? 'SMS notifications disabled' : 'SMS notifications enabled',
      data: {
        smsOptOut: user.smsOptOut,
        smsOptOutDate: user.smsOptOutDate
      }
    });

  } catch (error) {
    console.error('Error updating SMS preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update SMS preferences',
      error: error.message
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateSMSPreferences,
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

// Admin: Get today's registrations with user details
module.exports.getTodayRegistrations = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.max(parseInt(req.query.limit, 10) || 200, 1)
    const skip = (page - 1) * limit

    // Use Michigan timezone (America/Detroit)
    const moment = require('moment-timezone')
    const michiganNow = moment().tz('America/Detroit')
    const startOfDay = michiganNow.clone().startOf('day').toDate()
    const endOfDay = michiganNow.clone().endOf('day').toDate()

    console.log('🕐 Michigan Time - Today Registrations:', {
      michiganNow: michiganNow.format(),
      startOfDay: startOfDay,
      endOfDay: endOfDay
    })

    const query = { createdAt: { $gte: startOfDay, $lt: endOfDay } }

    const [users, totalCount] = await Promise.all([
      User.find(query)
        .select('fullName email phone createdAt status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ])

    const totalPages = Math.ceil(totalCount / limit) || 1

    res.status(200).json({
      success: true,
      count: users.length,
      total: totalCount,
      data: users,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
      }
    })
  } catch (error) {
    console.error('Error fetching today registrations:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Admin: Get today's logins with user details
module.exports.getTodayLogins = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.max(parseInt(req.query.limit, 10) || 200, 1)

    // Use Michigan timezone (America/Detroit)
    const moment = require('moment-timezone')
    const michiganNow = moment().tz('America/Detroit')
    const startOfDay = michiganNow.clone().startOf('day').toDate()
    const endOfDay = michiganNow.clone().endOf('day').toDate()

    console.log('🕐 Michigan Time - Today Logins:', {
      michiganNow: michiganNow.format(),
      startOfDay: startOfDay,
      endOfDay: endOfDay
    })

    const loginEvents = await LoginEvent.find({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    })
      .populate('user', 'fullName email phone')
      .sort({ createdAt: -1 })

    // Group by user to get unique users and their login count
    const userLoginMap = new Map()
    loginEvents.forEach(event => {
      if (event.user) {
        const userId = event.user._id.toString()
        if (!userLoginMap.has(userId)) {
          userLoginMap.set(userId, {
            user: event.user,
            loginCount: 1,
            lastLogin: event.createdAt,
            firstLogin: event.createdAt
          })
        } else {
          const existing = userLoginMap.get(userId)
          existing.loginCount++
          existing.lastLogin = event.createdAt > existing.lastLogin ? event.createdAt : existing.lastLogin
          existing.firstLogin = event.createdAt < existing.firstLogin ? event.createdAt : existing.firstLogin
        }
      }
    })

    const allUniqueUsers = Array.from(userLoginMap.values()).map(item => ({
      fullName: item.user.fullName,
      email: item.user.email,
      phone: item.user.phone,
      loginCount: item.loginCount,
      lastLogin: item.lastLogin,
      firstLogin: item.firstLogin
    }))

    // Apply pagination
    const totalCount = allUniqueUsers.length
    const totalPages = Math.ceil(totalCount / limit) || 1
    const skip = (page - 1) * limit
    const paginatedUsers = allUniqueUsers.slice(skip, skip + limit)

    res.status(200).json({
      success: true,
      count: paginatedUsers.length,
      total: totalCount,
      totalLogins: loginEvents.length,
      data: paginatedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
      }
    })
  } catch (error) {
    console.error('Error fetching today logins:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Admin: Get registrations by date range
module.exports.getRegistrationsByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.max(parseInt(req.query.limit, 10) || 200, 1)
    const skip = (page - 1) * limit
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'startDate and endDate are required' 
      })
    }

    // Parse dates in Michigan timezone
    const moment = require('moment-timezone')
    const start = moment.tz(startDate, 'America/Detroit').startOf('day').toDate()
    const end = moment.tz(endDate, 'America/Detroit').endOf('day').toDate()

    console.log('🕐 Michigan Time - Date Range Registrations:', {
      startDate, endDate, start, end
    })

    const query = { createdAt: { $gte: start, $lte: end } }

    const [users, totalCount] = await Promise.all([
      User.find(query)
        .select('fullName email phone createdAt status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ])

    const totalPages = Math.ceil(totalCount / limit) || 1

    res.status(200).json({
      success: true,
      count: users.length,
      total: totalCount,
      data: users,
      dateRange: { start, end },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
      }
    })
  } catch (error) {
    console.error('Error fetching registrations by date:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Admin: Get logins by date range
module.exports.getLoginsByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.max(parseInt(req.query.limit, 10) || 200, 1)
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'startDate and endDate are required' 
      })
    }

    // Parse dates in Michigan timezone
    const moment = require('moment-timezone')
    const start = moment.tz(startDate, 'America/Detroit').startOf('day').toDate()
    const end = moment.tz(endDate, 'America/Detroit').endOf('day').toDate()

    console.log('🕐 Michigan Time - Date Range Logins:', {
      startDate, endDate, start, end
    })

    const loginEvents = await LoginEvent.find({
      createdAt: { $gte: start, $lte: end }
    })
      .populate('user', 'fullName email phone')
      .sort({ createdAt: -1 })

    // Group by user
    const userLoginMap = new Map()
    loginEvents.forEach(event => {
      if (event.user) {
        const userId = event.user._id.toString()
        if (!userLoginMap.has(userId)) {
          userLoginMap.set(userId, {
            user: event.user,
            loginCount: 1,
            lastLogin: event.createdAt,
            firstLogin: event.createdAt
          })
        } else {
          const existing = userLoginMap.get(userId)
          existing.loginCount++
          existing.lastLogin = event.createdAt > existing.lastLogin ? event.createdAt : existing.lastLogin
          existing.firstLogin = event.createdAt < existing.firstLogin ? event.createdAt : existing.firstLogin
        }
      }
    })

    const allUniqueUsers = Array.from(userLoginMap.values()).map(item => ({
      fullName: item.user.fullName,
      email: item.user.email,
      phone: item.user.phone,
      loginCount: item.loginCount,
      lastLogin: item.lastLogin,
      firstLogin: item.firstLogin
    }))

    // Apply pagination
    const totalCount = allUniqueUsers.length
    const totalPages = Math.ceil(totalCount / limit) || 1
    const skip = (page - 1) * limit
    const paginatedUsers = allUniqueUsers.slice(skip, skip + limit)

    res.status(200).json({
      success: true,
      count: paginatedUsers.length,
      total: totalCount,
      totalLogins: loginEvents.length,
      data: paginatedUsers,
      dateRange: { start, end },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
      }
    })
  } catch (error) {
    console.error('Error fetching logins by date:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Admin: Get count of pending verifications
module.exports.getPendingVerificationsCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ status: 'pending' })
    
    res.status(200).json({
      success: true,
      count
    })
  } catch (error) {
    console.error('Error fetching pending verifications count:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

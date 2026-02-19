const PendingChange = require('../models/PendingChange')
const User = require('../models/User')
const Subscription = require('../models/Subscription')

const requestChange = async (req, res) => {
  try {
    const userId = req.user.id
    const { changeType, requestedData } = req.body

    if (!['profile', 'subscription', 'account'].includes(changeType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid change type'
      })
    }

    let currentData = {}
    if (changeType === 'profile' || changeType === 'account') {
      const user = await User.findById(userId).select('-otp -otpExpires')
      currentData = user.toObject()
    } else if (changeType === 'subscription') {
      const subscription = await Subscription.findOne({ userId })
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No subscription found'
        })
      }
      currentData = subscription.toObject()
    }

    const pendingChange = new PendingChange({
      userId,
      changeType,
      currentData,
      requestedData
    })

    await pendingChange.save()

    res.status(201).json({
      success: true,
      message: 'Change request submitted successfully. Admin will review it.',
      data: pendingChange
    })
  } catch (error) {
    console.error('Error creating change request:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit change request',
      error: error.message
    })
  }
}

const getPendingChanges = async (req, res) => {
  try {
    const { status, changeType, page = 1, limit = 20, startDate, endDate } = req.query
    const query = {}

    if (status) query.status = status
    if (changeType) query.changeType = changeType
    
    // Date filter
    if (startDate || endDate) {
      query.requestedAt = {}
      if (startDate) {
        query.requestedAt.$gte = new Date(startDate)
      }
      if (endDate) {
        // Add 1 day to include the end date fully
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        query.requestedAt.$lt = end
      }
    }

    const pendingChanges = await PendingChange.find(query)
      .populate('userId', 'fullName email phone')
      .populate('reviewedBy', 'fullName')
      .sort({ requestedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await PendingChange.countDocuments(query)

    res.json({
      success: true,
      data: pendingChanges,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching pending changes:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending changes'
    })
  }
}

const getUserPendingChanges = async (req, res) => {
  try {
    const userId = req.user.id

    const pendingChanges = await PendingChange.find({ userId })
      .sort({ requestedAt: -1 })

    res.json({
      success: true,
      data: pendingChanges
    })
  } catch (error) {
    console.error('Error fetching user pending changes:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending changes'
    })
  }
}

const reviewChange = async (req, res) => {
  try {
    const { id } = req.params
    const { status, reviewNotes } = req.body
    const adminId = req.user.id

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      })
    }

    const pendingChange = await PendingChange.findById(id)
    if (!pendingChange) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      })
    }

    if (pendingChange.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This change request has already been reviewed'
      })
    }

    if (status === 'approved') {
      if (pendingChange.changeType === 'profile' || pendingChange.changeType === 'account') {
        const allowedFields = ['fullName', 'phone', 'birthday', 'howDidYouHear', 'takesMedication', 'medicationDetails']
        const updateData = {}
        allowedFields.forEach(field => {
          if (pendingChange.requestedData[field] !== undefined) {
            updateData[field] = pendingChange.requestedData[field]
          }
        })
        
        if (pendingChange.requestedData.avatar) {
          updateData.avatar = pendingChange.requestedData.avatar
        }
        if (pendingChange.requestedData.governmentId) {
          updateData.governmentId = pendingChange.requestedData.governmentId
        }
        
        await User.findByIdAndUpdate(pendingChange.userId, updateData)
      } else if (pendingChange.changeType === 'subscription') {
        const allowedFields = ['preferences', 'allergies', 'billingAddress']
        const updateData = {}
        allowedFields.forEach(field => {
          if (pendingChange.requestedData[field] !== undefined) {
            updateData[field] = pendingChange.requestedData[field]
          }
        })
        await Subscription.findOneAndUpdate({ userId: pendingChange.userId }, updateData)
      }
    }

    pendingChange.status = status
    pendingChange.reviewedAt = new Date()
    pendingChange.reviewedBy = adminId
    pendingChange.reviewNotes = reviewNotes
    await pendingChange.save()

    res.json({
      success: true,
      message: `Change request ${status}`,
      data: pendingChange
    })
  } catch (error) {
    console.error('Error reviewing change:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to review change request',
      error: error.message
    })
  }
}

module.exports = {
  requestChange,
  getPendingChanges,
  getUserPendingChanges,
  reviewChange
}

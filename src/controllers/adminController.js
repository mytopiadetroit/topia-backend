const User = require('../models/User')
const bcrypt = require('bcryptjs')

// Get admin profile
const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id

    const admin = await User.findById(adminId).select('-password')

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      })
    }

    res.json({
      success: true,
      data: admin,
    })
  } catch (error) {
    console.error('Error fetching admin profile:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching admin profile',
      error: error.message,
    })
  }
}

// Update admin profile
const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id
    const { fullName, email, phone, currentPassword, newPassword } = req.body

    // Find admin
    const admin = await User.findById(adminId)
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      })
    }

    // Check if email is already taken by another user
    if (email && email !== admin.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: adminId } })
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user',
        })
      }
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password',
        })
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        admin.password,
      )
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        })
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long',
        })
      }
    }

    // Update fields
    const updateData = {}
    if (fullName) updateData.fullName = fullName
    if (email) updateData.email = email
    if (phone) updateData.phone = phone

    // Hash new password if provided
    if (newPassword) {
      const saltRounds = 10
      updateData.password = await bcrypt.hash(newPassword, saltRounds)
    }

    // Update admin profile
    const updatedAdmin = await User.findByIdAndUpdate(adminId, updateData, {
      new: true,
      runValidators: true,
    }).select('-password')

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedAdmin,
    })
  } catch (error) {
    console.error('Error updating admin profile:', error)
    res.status(500).json({
      success: false,
      message: 'Error updating admin profile',
      error: error.message,
    })
  }
}

module.exports = {
  getAdminProfile,
  updateAdminProfile,
}

const User = require('../models/User')
const Order = require('../models/Order')
const bcrypt = require('bcryptjs')
const ExcelJS = require('exceljs')

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

const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id
    const { fullName, email, phone, currentPassword, newPassword } = req.body

    const admin = await User.findById(adminId)
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      })
    }

    if (email && email !== admin.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: adminId } })
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user',
        })
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password',
        })
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password)
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

    const updateData = {}
    if (fullName) updateData.fullName = fullName
    if (email) updateData.email = email
    if (phone) updateData.phone = phone

    if (newPassword) {
      const saltRounds = 10
      updateData.password = await bcrypt.hash(newPassword, saltRounds)
    }

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

// Export customers data with orders to Professional Excel
const exportCustomersData = async (req, res) => {
  try {
    const users = await User.find({}).lean()
    const orders = await Order.find({}).populate('user', 'fullName email phone').lean()

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Shroomtopia Admin'
    workbook.created = new Date()
    workbook.modified = new Date()

    // ==================== SHEET 1: CUSTOMER SUMMARY ====================
    const customerSheet = workbook.addWorksheet('Customer Summary', {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { tabColor: { argb: 'FF4472C4' } }
    })

    customerSheet.columns = [
      { header: 'Customer ID', key: 'id', width: 28 },
      { header: 'Full Name', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Date of Birth', key: 'birthday', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Government ID', key: 'governmentId', width: 50 },
      { header: 'Reward Points', key: 'rewardPoints', width: 16 },
      { header: 'Total Orders', key: 'totalOrders', width: 14 },
      { header: 'Total Spent', key: 'totalSpent', width: 16 },
      { header: 'Registration Date', key: 'createdAt', width: 20 }
    ]

    const headerRow = customerSheet.getRow(1)
    headerRow.height = 25
    headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }

    users.forEach((user, index) => {
      const userOrders = orders.filter(order => 
        order.user && (order.user._id?.toString() === user._id.toString() || order.user.toString() === user._id.toString())
      )
      const totalSpent = userOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      
      const birthday = user.birthday 
        ? `${user.birthday.month}/${user.birthday.day}/${user.birthday.year}`
        : 'N/A'

      const row = customerSheet.addRow({
        id: user._id.toString(),
        fullName: user.fullName || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || 'N/A',
        birthday: birthday,
        status: user.status || 'pending',
        role: user.role || 'user',
        governmentId: user.governmentId || 'Not uploaded',
        rewardPoints: user.rewardPoints || 0,
        totalOrders: userOrders.length,
        totalSpent: totalSpent,
        createdAt: new Date(user.createdAt).toLocaleDateString('en-US')
      })

      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        }
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        }
        cell.alignment = { vertical: 'middle' }
      })

      row.getCell('totalSpent').numFmt = '$#,##0.00'
      row.getCell('totalSpent').alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell('role').alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell('totalOrders').alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell('rewardPoints').alignment = { horizontal: 'center', vertical: 'middle' }
      
      // Add hyperlink for Government ID if exists
      const govIdCell = row.getCell('governmentId')
      if (user.governmentId && user.governmentId !== 'Not uploaded') {
        govIdCell.value = {
          text: 'View Government ID',
          hyperlink: user.governmentId
        }
        govIdCell.font = { color: { argb: 'FF0000FF' }, underline: true }
        govIdCell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else {
        govIdCell.alignment = { horizontal: 'center', vertical: 'middle' }
        govIdCell.font = { color: { argb: 'FF999999' }, italic: true }
      }
    })

    // ==================== SHEET 2: DETAILED ORDERS ====================
    const ordersSheet = workbook.addWorksheet('Order Details', {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { tabColor: { argb: 'FF70AD47' } }
    })

    ordersSheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 28 },
      { header: 'Order Number', key: 'orderNumber', width: 18 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Customer Email', key: 'customerEmail', width: 32 },
      { header: 'Customer Phone', key: 'customerPhone', width: 18 },
      { header: 'Order Date', key: 'orderDate', width: 20 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Payment Method', key: 'paymentMethod', width: 18 },
      { header: 'Subtotal', key: 'subtotal', width: 14 },
      { header: 'Tax', key: 'tax', width: 12 },
      { header: 'Total Amount', key: 'totalAmount', width: 16 },
      { header: 'Products', key: 'products', width: 60 }
    ]

    const orderHeaderRow = ordersSheet.getRow(1)
    orderHeaderRow.height = 25
    orderHeaderRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    orderHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    }
    orderHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' }
    orderHeaderRow.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }

    orders.forEach((order, index) => {
      const products = (order.items || []).map(item => {
        const name = item.name || item.product?.name || 'Unknown'
        const qty = item.quantity || 1
        const price = item.price || item.product?.price || 0
        return `${name} (Qty: ${qty}, $${price.toFixed(2)})`
      }).join(' | ')

      const row = ordersSheet.addRow({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber || 'N/A',
        customerName: order.user?.fullName || 'N/A',
        customerEmail: order.user?.email || 'N/A',
        customerPhone: order.user?.phone || 'N/A',
        orderDate: new Date(order.createdAt).toLocaleDateString('en-US'),
        status: order.status || 'pending',
        paymentMethod: order.paymentMethod || 'N/A',
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        totalAmount: order.totalAmount || 0,
        products: products || 'No products'
      })

      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        }
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        }
        cell.alignment = { vertical: 'middle' }
      })

      row.getCell('subtotal').numFmt = '$#,##0.00'
      row.getCell('tax').numFmt = '$#,##0.00'
      row.getCell('totalAmount').numFmt = '$#,##0.00'
      
      row.getCell('subtotal').alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell('tax').alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell('totalAmount').alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // ==================== SHEET 3: SUMMARY STATISTICS ====================
    const summarySheet = workbook.addWorksheet('Summary Statistics', {
      properties: { tabColor: { argb: 'FFFFC000' } }
    })

    summarySheet.mergeCells('A1:D1')
    const titleCell = summarySheet.getCell('A1')
    titleCell.value = '🍄 SHROOMTOPIA - CUSTOMER DATA SUMMARY'
    titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8B4513' }
    }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    summarySheet.getRow(1).height = 35

    const stats = [
      ['', '', '', ''],
      ['📊 CUSTOMER STATISTICS', '', '', ''],
      ['Total Customers', users.length, '', ''],
      ['Verified Customers', users.filter(u => u.status === 'verified').length, '', ''],
      ['Pending Verifications', users.filter(u => u.status === 'pending').length, '', ''],
      ['Suspended Accounts', users.filter(u => u.status === 'suspend').length, '', ''],
      ['', '', '', ''],
      ['💰 ORDER STATISTICS', '', '', ''],
      ['Total Orders', orders.length, '', ''],
      ['Pending Orders', orders.filter(o => o.status === 'pending').length, '', ''],
      ['Fulfilled Orders', orders.filter(o => o.status === 'fulfilled').length, '', ''],
      ['Completed Orders', orders.filter(o => o.status === 'completed').length, '', ''],
      ['', '', '', ''],
      ['💵 REVENUE STATISTICS', '', '', ''],
      ['Total Revenue', `$${orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)}`, '', ''],
      ['Average Order Value', `$${(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / (orders.length || 1)).toFixed(2)}`, '', ''],
      ['', '', '', ''],
      ['📅 EXPORT INFORMATION', '', '', ''],
      ['Export Date', new Date().toLocaleString('en-US'), '', ''],
      ['Generated By', 'Shroomtopia Admin System', '', '']
    ]

    stats.forEach((row, index) => {
      const excelRow = summarySheet.addRow(row)
      
      if (row[0].includes('STATISTICS') || row[0].includes('INFORMATION')) {
        excelRow.font = { bold: true, size: 14, color: { argb: 'FF4472C4' } }
        excelRow.height = 25
      }
      
      if (row[0] && !row[0].includes('STATISTICS') && !row[0].includes('INFORMATION') && row[0] !== '') {
        excelRow.getCell(1).font = { bold: true, size: 11 }
        excelRow.getCell(2).font = { size: 11 }
        excelRow.height = 22
        
        excelRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        }
      }
    })

    summarySheet.getColumn(1).width = 30
    summarySheet.getColumn(2).width = 25

    const buffer = await workbook.xlsx.writeBuffer()

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=Shroomtopia_Customers_${new Date().toISOString().split('T')[0]}.xlsx`)
    
    res.send(buffer)
  } catch (error) {
    console.error('Error exporting customers data:', error)
    res.status(500).json({
      success: false,
      message: 'Error exporting customers data',
      error: error.message
    })
  }
}

module.exports = {
  getAdminProfile,
  updateAdminProfile,
  exportCustomersData
}

const User = require('../models/User')
const Order = require('../models/Order')
const Visitor = require('../models/Visitor')


const getReturningCustomers = async (req, res) => {
  try {
    const { period = '30', limit = 50 } = req.query // days
    const days = parseInt(period)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get visitors with multiple visits
    const returningVisitors = await Visitor.aggregate([
      {
        $match: {
          visitCount: { $gt: 1 },
          lastVisit: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalReturning: { $sum: 1 },
          avgVisits: { $avg: '$visitCount' }
        }
      }
    ])
    
    // Get total unique visitors in period
    const totalVisitors = await Visitor.countDocuments({
      lastVisit: { $gte: startDate }
    })
    
    // Get daily returning customer trend
    const dailyTrend = await Visitor.aggregate([
      {
        $match: {
          visitCount: { $gt: 1 },
          lastVisit: { $gte: startDate }
        }
      },
      {
        $project: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$lastVisit' }
          }
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])
    
    // Get detailed list of returning customers with their visit history
    const returningCustomersList = await Visitor.find({
      visitCount: { $gt: 1 },
      lastVisit: { $gte: startDate }
    })
      .populate('userId', 'fullName email phone')
      .sort({ visitCount: -1, lastVisit: -1 })
      .limit(parseInt(limit))
      .lean()
    
    // Format the list with visit details
    const formattedList = returningCustomersList.map(visitor => ({
      _id: visitor._id,
      phone: visitor.phone,
      customerName: visitor.userId?.fullName || 'Guest',
      email: visitor.userId?.email || 'N/A',
      customerPhone: visitor.userId?.phone || visitor.phone,
      isMember: visitor.isMember,
      totalVisits: visitor.visitCount,
      lastVisit: visitor.lastVisit,
      visits: visitor.visits.slice(-5).reverse(), // Last 5 visits
      allVisits: visitor.visits.length
    }))
    
    const returningCount = returningVisitors[0]?.totalReturning || 0
    const returnRate = totalVisitors > 0 ? ((returningCount / totalVisitors) * 100).toFixed(1) : 0
    
    res.json({
      success: true,
      data: {
        totalReturning: returningCount,
        totalVisitors,
        returnRate: parseFloat(returnRate),
        avgVisits: returningVisitors[0]?.avgVisits?.toFixed(1) || 0,
        dailyTrend,
        returningCustomersList: formattedList
      }
    })
  } catch (error) {
    console.error('Error fetching returning customers:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching returning customers data',
      error: error.message
    })
  }
}


const getSalesComparison = async (req, res) => {
  try {
    const now = new Date()
    
    // Current week (last 7 days)
    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - 7)
    
    // Previous week (8-14 days ago)
    const previousWeekStart = new Date(now)
    previousWeekStart.setDate(now.getDate() - 14)
    const previousWeekEnd = new Date(now)
    previousWeekEnd.setDate(now.getDate() - 7)
    
    // Week before that (15-21 days ago)
    const twoWeeksAgoStart = new Date(now)
    twoWeeksAgoStart.setDate(now.getDate() - 21)
    const twoWeeksAgoEnd = new Date(now)
    twoWeeksAgoEnd.setDate(now.getDate() - 14)
    
    // Current week sales
    const currentWeekOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: currentWeekStart },
          status: { $in: ['fulfilled', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ])
    
    // Previous week sales
    const previousWeekOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousWeekStart, $lt: previousWeekEnd },
          status: { $in: ['fulfilled', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ])
    
    // Two weeks ago sales
    const twoWeeksAgoOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: twoWeeksAgoStart, $lt: twoWeeksAgoEnd },
          status: { $in: ['fulfilled', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ])
    
    // Daily sales for current week
    const dailySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: currentWeekStart },
          status: { $in: ['fulfilled', 'completed'] }
        }
      },
      {
        $project: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalAmount: 1
        }
      },
      {
        $group: {
          _id: '$date',
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])
    
    const currentWeek = currentWeekOrders[0] || { totalSales: 0, orderCount: 0 }
    const previousWeek = previousWeekOrders[0] || { totalSales: 0, orderCount: 0 }
    const twoWeeksAgo = twoWeeksAgoOrders[0] || { totalSales: 0, orderCount: 0 }
    
    // Calculate growth percentage
    const growthVsPrevious = previousWeek.totalSales > 0 
      ? (((currentWeek.totalSales - previousWeek.totalSales) / previousWeek.totalSales) * 100).toFixed(1)
      : 0
    
    res.json({
      success: true,
      data: {
        currentWeek: {
          sales: currentWeek.totalSales,
          orders: currentWeek.orderCount
        },
        previousWeek: {
          sales: previousWeek.totalSales,
          orders: previousWeek.orderCount
        },
        twoWeeksAgo: {
          sales: twoWeeksAgo.totalSales,
          orders: twoWeeksAgo.orderCount
        },
        growth: parseFloat(growthVsPrevious),
        dailySales
      }
    })
  } catch (error) {
    console.error('Error fetching sales comparison:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching sales comparison data',
      error: error.message
    })
  }
}


const getTopSellingProducts = async (req, res) => {
  try {
    const { limit = 10, period = '30' } = req.query
    const days = parseInt(period)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['fulfilled', 'completed'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalQuantity: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $project: {
          productName: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
          currentStock: { $arrayElemAt: ['$productDetails.stock', 0] },
          image: { $arrayElemAt: ['$productDetails.images', 0] }
        }
      }
    ])
    
    res.json({
      success: true,
      data: topProducts
    })
  } catch (error) {
    console.error('Error fetching top selling products:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching top selling products',
      error: error.message
    })
  }
}

// Get revenue analytics
const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query
    const days = parseInt(period)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Total revenue
    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['fulfilled', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ])
    
    // Revenue by payment method
    const revenueByPayment = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['fulfilled', 'completed'] }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ])
    
    const revenue = revenueData[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 }
    
    res.json({
      success: true,
      data: {
        totalRevenue: revenue.totalRevenue,
        totalOrders: revenue.totalOrders,
        avgOrderValue: revenue.avgOrderValue,
        revenueByPayment
      }
    })
  } catch (error) {
    console.error('Error fetching revenue analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue analytics',
      error: error.message
    })
  }
}

// Get customer growth analytics
const getCustomerGrowth = async (req, res) => {
  try {
    const { period = '30' } = req.query
    const days = parseInt(period)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Daily registrations
    const dailyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          role: 'user'
        }
      },
      {
        $project: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          }
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])
    
    // Total customers
    const totalCustomers = await User.countDocuments({ role: 'user' })
    const verifiedCustomers = await User.countDocuments({ role: 'user', status: 'verified' })
    
    res.json({
      success: true,
      data: {
        totalCustomers,
        verifiedCustomers,
        dailyRegistrations
      }
    })
  } catch (error) {
    console.error('Error fetching customer growth:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching customer growth data',
      error: error.message
    })
  }
}

module.exports = {
  getReturningCustomers,
  getSalesComparison,
  getTopSellingProducts,
  getRevenueAnalytics,
  getCustomerGrowth
}

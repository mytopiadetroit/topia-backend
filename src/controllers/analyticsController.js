const User = require('../models/User')
const Order = require('../models/Order')
const Visitor = require('../models/Visitor')


const getReturningCustomers = async (req, res) => {
  try {
    const { period = '30', limit = 50 } = req.query;
    
    let dateFilter = {};
    let startDate = new Date();
    
    if (period !== 'all') {
      const days = parseInt(period);
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { lastVisit: { $gte: startDate } };
    } else {
      startDate = new Date(0);
    }
    
    const returningVisitors = await Visitor.aggregate([
      {
        $match: {
          visitCount: { $gt: 1 },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalReturning: { $sum: 1 },
          avgVisits: { $avg: '$visitCount' }
        }
      }
    ]);
    
    const totalVisitorsMatch = period !== 'all' ? { lastVisit: { $gte: startDate } } : {};
    const totalVisitors = await Visitor.countDocuments(totalVisitorsMatch);
    
    const dailyTrendMatch = {
      visitCount: { $gt: 1 },
      ...(period !== 'all' && { lastVisit: { $gte: startDate } })
    };
    
    const dailyTrend = await Visitor.aggregate([
      {
        $match: dailyTrendMatch
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
    ]);
    
    const returningCustomersListMatch = {
      visitCount: { $gt: 1 },
      ...(period !== 'all' && { lastVisit: { $gte: startDate } })
    };
    
    const returningCustomersList = await Visitor.find(returningCustomersListMatch)
      .populate('userId', 'fullName email phone')
      .sort({ visitCount: -1, lastVisit: -1 })
      .limit(parseInt(limit))
      .lean();
    
    const formattedList = returningCustomersList.map(visitor => ({
      _id: visitor._id,
      phone: visitor.phone,
      customerName: visitor.userId?.fullName || 'Guest',
      email: visitor.userId?.email || 'N/A',
      customerPhone: visitor.userId?.phone || visitor.phone,
      isMember: visitor.isMember,
      totalVisits: visitor.visitCount,
      lastVisit: visitor.lastVisit,
      visits: visitor.visits.slice(-5).reverse(),
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
    
  
    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - 7)
    
   
    const previousWeekStart = new Date(now)
    previousWeekStart.setDate(now.getDate() - 14)
    const previousWeekEnd = new Date(now)
    previousWeekEnd.setDate(now.getDate() - 7)
    
   
    const twoWeeksAgoStart = new Date(now)
    twoWeeksAgoStart.setDate(now.getDate() - 21)
    const twoWeeksAgoEnd = new Date(now)
    twoWeeksAgoEnd.setDate(now.getDate() - 14)
    
   
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
    const { limit = 10, period = '30' } = req.query;
    
    let dateFilter = {};
    if (period !== 'all') {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { createdAt: { $gte: startDate } };
    }
    
    const topProducts = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
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


const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    let dateFilter = {};
    if (period !== 'all') {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { createdAt: { $gte: startDate } };
    }
    
    const revenueData = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
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
    ]);
    
    const revenueByPayment = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
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
    ]);
    
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


const getCustomerGrowth = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    let dateFilter = {};
    if (period !== 'all') {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { createdAt: { $gte: startDate } };
    }
    
    const dailyRegistrations = await User.aggregate([
      ...(period !== 'all' ? [{ $match: dateFilter }] : []),
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
    
 
    const totalCustomers = await User.countDocuments({})
    const verifiedCustomers = await User.countDocuments({ status: 'verified' })
    
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


const getRegistrationsVsVisits = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    let dateFilter = {};
    if (period !== 'all') {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { createdAt: { $gte: startDate } };
    }
    
    const totalRegistrations = await User.countDocuments(dateFilter);
    
    const registeredUsersWhoVisited = await User.aggregate([
      ...(period !== 'all' ? [{ $match: dateFilter }] : []),
      {
        $lookup: {
          from: 'visitors',
          localField: '_id',
          foreignField: 'userId',
          as: 'visits'
        }
      },
      {
        $match: {
          'visits.0': { $exists: true }
        }
      },
      {
        $count: 'totalVisited'
      }
    ]);
    
    const usersWhoVisited = registeredUsersWhoVisited[0]?.totalVisited || 0;
    const usersWhoDidntVisit = totalRegistrations - usersWhoVisited;
    
    const conversionRate = totalRegistrations > 0 ? 
      ((usersWhoVisited / totalRegistrations) * 100).toFixed(1) : 0;
    
    const dailyBreakdown = await User.aggregate([
      ...(period !== 'all' ? [{ $match: dateFilter }] : []),
      {
        $project: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          userId: '$_id'
        }
      },
      {
        $group: {
          _id: '$date',
          registrations: { $sum: 1 },
          userIds: { $push: '$userId' }
        }
      },
      {
        $lookup: {
          from: 'visitors',
          let: { userIds: '$userIds' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$userId', '$$userIds'] }
              }
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 }
              }
            }
          ],
          as: 'visitData'
        }
      },
      {
        $project: {
          date: '$_id',
          registrations: 1,
          visits: { $ifNull: [{ $arrayElemAt: ['$visitData.count', 0] }, 0] }
        }
      },
      {
        $sort: { date: 1 }
      }
    ])
    
    res.json({
      success: true,
      data: {
        totalRegistrations,
        usersWhoVisited,
        usersWhoDidntVisit,
        conversionRate: parseFloat(conversionRate),
        dailyBreakdown
      }
    })
  } catch (error) {
    console.error('Error fetching registrations vs visits:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations vs visits data',
      error: error.message
    })
  }
}

module.exports = {
  getReturningCustomers,
  getSalesComparison,
  getTopSellingProducts,
  getRevenueAnalytics,
  getCustomerGrowth,
  getRegistrationsVsVisits,
  getDashboardStats
}

// Get Dashboard Statistics including Topia Circle members
async function getDashboardStats(req, res) {
  try {
    const { period = 'all' } = req.query;
    
    let dateFilter = {};
    if (period !== 'all') {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { createdAt: { $gte: startDate } };
    }
    
    const topiaCircleMembers = await User.countDocuments({
      isTopiaCircleMember: true,
      subscriptionStatus: 'active',
      ...(period !== 'all' && dateFilter)
    });
    
    const totalUsers = await User.countDocuments(period !== 'all' ? dateFilter : {});
    
    const totalOrders = await Order.countDocuments(period !== 'all' ? dateFilter : {});
    
    const revenueMatch = { status: { $in: ['completed', 'delivered'] } };
    if (period !== 'all') {
      revenueMatch.createdAt = dateFilter.createdAt;
    }
    
    const revenueData = await Order.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      data: {
        topiaCircleMembers,
        totalUsers,
        totalOrders,
        totalRevenue,
        recentOrders,
        period
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
}

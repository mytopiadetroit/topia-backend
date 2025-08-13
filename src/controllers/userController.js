const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');

// Get all users with pagination support
const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);

    const totalUsers = await User.countDocuments({});
    const totalPages = Math.ceil(totalUsers / limit) || 1;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
      count: users.length,
      meta: {
        page,
        limit,
        total: totalUsers,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};

// Admin: get login stats for last 7 days including today
module.exports.getLoginStats = async (req, res) => {
  try {
    // Only admins should reach here (enforced in route)
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    // 7 days window start
    const sevenDaysAgo = new Date(start);
    sevenDaysAgo.setDate(start.getDate() - 6);

    const pipeline = [
      { $match: { createdAt: { $gte: sevenDaysAgo, $lte: new Date() } } },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
            d: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
    ];

    const raw = await LoginEvent.aggregate(pipeline);

    // Map to last 7 days array
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      days.push({ key, date: d, count: 0 });
    }

    const map = new Map(
      raw.map((r) => [
        `${r._id.y}-${r._id.m}-${r._id.d}`,
        r.count
      ])
    );

    const result = days.map((d) => ({
      date: d.date,
      label: d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: map.get(d.key) || 0
    }));

    const today = result[result.length - 1]?.count || 0;

    res.status(200).json({ success: true, today, last7Days: result });
  } catch (error) {
    console.error('Error fetching login stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const Reward = require('../models/Reward');
const User = require('../models/User');

// Task definitions
const REWARD_TASKS = {
  'join-groove': { title: 'Join Groove Group', reward: 1 },
  'follow-ig': { title: 'Follow Us On IG', reward: 1 },
  'save-whatsapp': { title: 'Save WhatsApp Contact', reward: 1 },
  'google-review': { title: 'Google Review', reward: 1 },
  'tag-selfie': { title: 'Tag Us Selfie Wall Photo', reward: 1 },
  'first-experience': { title: 'First Experience Share', reward: 1 },
  'subscribe-yt': { title: 'Subscribe YT Channel', reward: 1 },
  'share-journey': { title: 'Share Your Journey', reward: 1 },
  'bring-friend': { title: 'Bring a Friend', reward: 1 },
  'special-reward': { title: 'Special Reward', reward: 1 }
};

// Get all reward tasks with user completion status
const getRewardTasks = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user's completed tasks
    const completedTasks = await Reward.find({
      user: userId,
      status: { $in: ['approved', 'pending'] }
    }).select('taskId status');

    const completedTaskIds = completedTasks.map(task => task.taskId);

    // Build task list with completion status
    const tasks = Object.keys(REWARD_TASKS).map(taskId => ({
      id: taskId,
      title: REWARD_TASKS[taskId].title,
      reward: REWARD_TASKS[taskId].reward,
      completed: completedTaskIds.includes(taskId),
      status: completedTasks.find(t => t.taskId === taskId)?.status || null
    }));

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reward tasks',
      error: error.message
    });
  }
};

// Submit reward claim
const submitRewardClaim = async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('Full req.body:', req.body);
    console.log('req.files:', req.files);
    
    const { taskId, proofType, proofText } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('Received taskId:', taskId);
    console.log('Available REWARD_TASKS:', Object.keys(REWARD_TASKS));
    console.log('Task exists:', !!REWARD_TASKS[taskId]);
    
    if (!taskId || !REWARD_TASKS[taskId]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Check if user already claimed this task
    const existingClaim = await Reward.findOne({
      user: userId,
      taskId: taskId
    });

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: 'Task already claimed'
      });
    }

    const rewardData = {
      user: userId,
      taskId,
      taskTitle: REWARD_TASKS[taskId].title,
      amount: REWARD_TASKS[taskId].reward,
      proofType,
      proofText: proofText || ''
    };

    // Handle file uploads (AWS S3 or local fallback) with proper file type detection
    if (req.files) {
      // Handle all uploaded files and categorize by MIME type
      Object.keys(req.files).forEach(fieldName => {
        const file = req.files[fieldName][0];
        const fileUrl = file.location || `/uploads/${file.filename}`;
        
        if (file.mimetype.startsWith('image/')) {
          rewardData.proofImage = fileUrl;
        } else if (file.mimetype.startsWith('audio/')) {
          rewardData.proofAudio = fileUrl;
        } else if (file.mimetype.startsWith('video/')) {
          rewardData.proofVideo = fileUrl;
        }
      });
      
      // Fallback to field name based assignment if MIME type detection fails
      if (req.files.proofImage && !rewardData.proofImage) {
        rewardData.proofImage = req.files.proofImage[0].location || 
          `/uploads/${req.files.proofImage[0].filename}`;
      }
      if (req.files.proofAudio && !rewardData.proofAudio) {
        rewardData.proofAudio = req.files.proofAudio[0].location || 
          `/uploads/${req.files.proofAudio[0].filename}`;
      }
      if (req.files.proofVideo && !rewardData.proofVideo) {
        rewardData.proofVideo = req.files.proofVideo[0].location || 
          `/uploads/${req.files.proofVideo[0].filename}`;
      }
    }

    const reward = new Reward(rewardData);
    await reward.save();

    const populatedReward = await Reward.findById(reward._id).populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Reward claim submitted successfully',
      data: populatedReward
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error submitting reward claim',
      error: error.message
    });
  }
};

// Get user's reward history
const getUserRewards = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const rewards = await Reward.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('approvedBy', 'name email');

    const totalEarned = await Reward.getUserTotalRewards(userId);

    res.json({
      success: true,
      data: rewards,
      totalEarned
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user rewards',
      error: error.message
    });
  }
};

// Get user's pending reward requests
const getUserRewardRequests = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const requests = await Reward.find({ 
      user: userId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reward requests',
      error: error.message
    });
  }
};

// Admin: Get all reward requests
const getAllRewardRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'pending';

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const rewards = await Reward.find(filter)
      .populate('user', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reward.countDocuments(filter);

    res.json({
      success: true,
      data: rewards,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reward requests',
      error: error.message
    });
  }
};

// Admin: Approve/Reject reward
const updateRewardStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.user?.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const reward = await Reward.findById(id);
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }

    const updateData = {
      status,
      adminNotes: adminNotes || '',
      approvedBy: adminId
    };

    if (status === 'approved') {
      updateData.approvedAt = new Date();
      
      // Check if user completed all tasks for $15 bonus
      const userId = reward.user;
      const isEligibleForBonus = await Reward.checkBonusEligibility(userId);
      
      if (isEligibleForBonus) {
        // Check if bonus already given
        const bonusReward = await Reward.findOne({
          user: userId,
          taskId: 'completion-bonus',
          status: 'approved'
        });
        
        if (!bonusReward) {
          // Create bonus reward
          const bonus = new Reward({
            user: userId,
            taskId: 'completion-bonus',
            taskTitle: 'All Tasks Completion Bonus',
            amount: 15,
            proofType: 'text',
            proofText: 'Automatic bonus for completing all tasks',
            status: 'approved',
            approvedBy: adminId,
            approvedAt: new Date()
          });
          await bonus.save();
        }
      }
    } else {
      updateData.rejectedAt = new Date();
    }

    const updatedReward = await Reward.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('user', 'name email').populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: `Reward ${status} successfully`,
      data: updatedReward
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating reward status',
      error: error.message
    });
  }
};

// Admin: Get reward statistics
const getRewardStats = async (req, res) => {
  try {
    const stats = await Reward.aggregate([
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          pendingRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          totalAmountPaid: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
          }
        }
      }
    ]);

    const taskStats = await Reward.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$taskId',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          totalAmountPaid: 0
        },
        byTask: taskStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reward statistics',
      error: error.message
    });
  }
};

module.exports = {
  getRewardTasks,
  submitRewardClaim,
  getUserRewards,
  getUserRewardRequests,
  getAllRewardRequests,
  updateRewardStatus,
  getRewardStats
};

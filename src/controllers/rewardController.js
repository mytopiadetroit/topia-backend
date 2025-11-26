const Reward = require('../models/Reward')
const User = require('../models/User')
const RewardTask = require('../models/RewardTask')

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
  'special-reward': { title: 'Special Reward', reward: 1 },
}

// Get all reward tasks with user completion status
const getRewardTasks = async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    // Get dynamic tasks from database (only visible ones)
    // Filter tasks based on visibility type:
    // - 'all': Show to all users
    // - 'specific': Show only if user is in assignedUsers array
    console.log('🔍 Fetching tasks for user:', userId);
    console.log('👤 User type:', typeof userId);
    
    // First, let's check ALL tasks in database
    const allTasks = await RewardTask.find({});
    console.log('📊 Total tasks in database:', allTasks.length);
    console.log('📊 All tasks:', allTasks.map(t => ({
      taskId: t.taskId,
      title: t.title,
      isVisible: t.isVisible,
      visibilityType: t.visibilityType,
      assignedUsers: t.assignedUsers?.map(id => id.toString()) || []
    })));
    
    // Convert userId to ObjectId for proper comparison
    const mongoose = require('mongoose');
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Check visible tasks
    const visibleTasks = await RewardTask.find({ isVisible: true });
    console.log('👁️ Visible tasks:', visibleTasks.length);
    
    // Check tasks with visibilityType 'all'
    const allUserTasks = await RewardTask.find({ 
      isVisible: true, 
      visibilityType: 'all' 
    });
    console.log('🌍 Tasks for all users:', allUserTasks.length);
    
    // Check tasks with visibilityType 'specific'
    const specificTasks = await RewardTask.find({ 
      isVisible: true, 
      visibilityType: 'specific' 
    });
    console.log('🎯 Specific tasks:', specificTasks.length);
    console.log('🎯 Specific tasks details:', specificTasks.map(t => ({
      taskId: t.taskId,
      title: t.title,
      assignedUsers: t.assignedUsers?.map(id => id.toString()) || [],
      hasCurrentUser: t.assignedUsers?.some(id => id.toString() === userId.toString())
    })));
    
    // Check if current user is in any specific task
    const userSpecificTasks = await RewardTask.find({
      isVisible: true,
      visibilityType: 'specific',
      assignedUsers: userObjectId
    });
    console.log('👤 Tasks assigned to current user:', userSpecificTasks.length);
    
    let rewardTasks = await RewardTask.find({
      isVisible: true,
      $or: [
        { visibilityType: 'all' },
        { visibilityType: { $exists: false } }, // Handle old tasks without visibilityType
        { visibilityType: null }, // Handle null visibilityType
        { visibilityType: 'specific', assignedUsers: userObjectId }
      ]
    }).sort({ order: 1 })
    
    console.log('📋 Found tasks after filter:', rewardTasks.length);
    console.log('📝 Filtered tasks details:', rewardTasks.map(t => ({
      taskId: t.taskId,
      title: t.title,
      visibilityType: t.visibilityType,
      assignedUsers: t.assignedUsers?.map(id => id.toString()) || [],
      isUserAssigned: t.assignedUsers?.some(id => id.toString() === userId.toString())
    })));

    // Get user's completed tasks
    const completedTasks = await Reward.find({
      user: userId,
      status: { $in: ['approved', 'pending'] },
    }).select('taskId status')

    const completedTaskIds = completedTasks.map((task) => task.taskId)

    // Build task list with completion status
    const tasks = rewardTasks.map((task) => ({
      id: task.taskId,
      title: task.title,
      reward: task.reward,
      description: task.description || '',
      completed: completedTaskIds.includes(task.taskId),
      status: completedTasks.find((t) => t.taskId === task.taskId)?.status || null,
    }))

    res.json({
      success: true,
      data: tasks,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reward tasks',
      error: error.message,
    })
  }
}

// Submit reward claim
const submitRewardClaim = async (req, res) => {
  try {
    const userId = req.user?.id
    console.log('Full req.body:', req.body)
    console.log('req.files:', req.files)

    const { taskId, proofType, proofText } = req.body

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    // Check if task exists in database or fallback to default tasks
    let taskInfo = await RewardTask.findOne({ taskId })
    
    if (!taskInfo) {
      // Fallback to default tasks
      if (REWARD_TASKS[taskId]) {
        taskInfo = {
          taskId,
          title: REWARD_TASKS[taskId].title,
          reward: REWARD_TASKS[taskId].reward,
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid task ID',
        })
      }
    }

    // Check if task is visible
    if (taskInfo.isVisible === false) {
      return res.status(400).json({
        success: false,
        message: 'Task is not available',
      })
    }

    // Check if user already claimed this task
    const existingClaim = await Reward.findOne({
      user: userId,
      taskId: taskId,
    })

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: 'Task already claimed',
      })
    }

    const rewardData = {
      user: userId,
      taskId,
      taskTitle: taskInfo.title,
      amount: taskInfo.reward,
      proofType,
      proofText: proofText || '',
    }

    // Handle file uploads (AWS S3 or local fallback) with proper file type detection
    if (req.files) {
      // Handle all uploaded files and categorize by MIME type
      Object.keys(req.files).forEach((fieldName) => {
        const file = req.files[fieldName][0]
        const fileUrl = file.location || `/uploads/${file.filename}`

        if (file.mimetype.startsWith('image/')) {
          rewardData.proofImage = fileUrl
        } else if (file.mimetype.startsWith('audio/')) {
          rewardData.proofAudio = fileUrl
        } else if (file.mimetype.startsWith('video/')) {
          rewardData.proofVideo = fileUrl
        }
      })

      // Fallback to field name based assignment if MIME type detection fails
      if (req.files.proofImage && !rewardData.proofImage) {
        rewardData.proofImage =
          req.files.proofImage[0].location ||
          `/uploads/${req.files.proofImage[0].filename}`
      }
      if (req.files.proofAudio && !rewardData.proofAudio) {
        rewardData.proofAudio =
          req.files.proofAudio[0].location ||
          `/uploads/${req.files.proofAudio[0].filename}`
      }
      if (req.files.proofVideo && !rewardData.proofVideo) {
        rewardData.proofVideo =
          req.files.proofVideo[0].location ||
          `/uploads/${req.files.proofVideo[0].filename}`
      }
    }

    const reward = new Reward(rewardData)
    await reward.save()

    const populatedReward = await Reward.findById(reward._id).populate(
      'user',
      'name email',
    )

    res.status(201).json({
      success: true,
      message: 'Reward claim submitted successfully',
      data: populatedReward,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error submitting reward claim',
      error: error.message,
    })
  }
}

// Get user's reward history
const getUserRewards = async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    const rewards = await Reward.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('approvedBy', 'name email')

    const totalEarned = await Reward.getUserTotalRewards(userId)

    res.json({
      success: true,
      data: rewards,
      totalEarned,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user rewards',
      error: error.message,
    })
  }
}

// Get user's pending reward requests
const getUserRewardRequests = async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    const requests = await Reward.find({
      user: userId,
      status: 'pending',
    }).sort({ createdAt: -1 })

    res.json({
      success: true,
      data: requests,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reward requests',
      error: error.message,
    })
  }
}

// Admin: Get all reward requests
const getAllRewardRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const status = req.query.status || 'pending'

    const filter = {}
    if (status && status !== 'all') {
      filter.status = status
    }

    const rewards = await Reward.find(filter)
      .populate('user', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Reward.countDocuments(filter)

    res.json({
      success: true,
      data: rewards,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reward requests',
      error: error.message,
    })
  }
}

// Admin: Approve/Reject reward
const updateRewardStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, adminNotes } = req.body
    const adminId = req.user?.id

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      })
    }

    const reward = await Reward.findById(id).populate('user', 'fullName email')
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found',
      })
    }

    const updateData = {
      status,
      adminNotes: adminNotes || '',
      approvedBy: adminId,
    }

    // Check if status is actually changing
    const isStatusChanging = reward.status !== status;

    if (status === 'approved') {
      updateData.approvedAt = new Date()

      // Add points to user's balance (only if status is changing to avoid duplicate points)
      if (isStatusChanging) {
        const user = await User.findById(reward.user._id)
        if (user) {
          user.rewardPoints = (user.rewardPoints || 0) + reward.amount
          await user.save()
        }
      }

      // Send approval email (always send when approving, even if already approved)
      const { sendRewardApprovedEmail } = require('../utils/emailService')
      const firstName = reward.user.fullName?.split(' ')[0] || 'User'
      sendRewardApprovedEmail(
        reward.user.email,
        firstName,
        reward.taskTitle,
        reward.amount
      ).catch(err => {
        console.error('Failed to send reward approval email:', err)
      })

      // Check if user completed all tasks for $15 bonus
      const userId = reward.user._id
      const isEligibleForBonus = await Reward.checkBonusEligibility(userId)

      if (isEligibleForBonus) {
        // Check if bonus already given
        const bonusReward = await Reward.findOne({
          user: userId,
          taskId: 'completion-bonus',
          status: 'approved',
        })

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
            approvedAt: new Date(),
          })
          await bonus.save()
          
          // Add bonus points to user
          if (user) {
            user.rewardPoints = (user.rewardPoints || 0) + 15
            await user.save()
          }
        }
      }
    } else {
      updateData.rejectedAt = new Date()
      
      // Send rejection email
      const { sendRewardRejectedEmail } = require('../utils/emailService')
      const firstName = reward.user.fullName?.split(' ')[0] || 'User'
      sendRewardRejectedEmail(
        reward.user.email,
        firstName,
        reward.taskTitle,
        adminNotes || ''
      ).catch(err => {
        console.error('Failed to send reward rejection email:', err)
      })
    }

    const updatedReward = await Reward.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate('user', 'fullName email')
      .populate('approvedBy', 'fullName email')

    res.json({
      success: true,
      message: `Reward ${status} successfully`,
      data: updatedReward,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating reward status',
      error: error.message,
    })
  }
}

// Admin: Get reward statistics
const getRewardStats = async (req, res) => {
  try {
    const stats = await Reward.aggregate([
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          pendingRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          approvedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
          rejectedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
          totalAmountPaid: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] },
          },
        },
      },
    ])

    const taskStats = await Reward.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$taskId',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { count: -1 } },
    ])

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          totalAmountPaid: 0,
        },
        byTask: taskStats,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reward statistics',
      error: error.message,
    })
  }
}

// Admin: Get all reward tasks (including hidden ones)
const getAllRewardTasks = async (req, res) => {
  try {
    const tasks = await RewardTask.find()
      .sort({ order: 1, createdAt: -1 })
      .populate('createdBy', 'fullName email')
      .populate('assignedUsers', 'fullName email')

    res.json({
      success: true,
      data: tasks,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reward tasks',
      error: error.message,
    })
  }
}

// Admin: Create new reward task
const createRewardTask = async (req, res) => {
  try {
    const { taskId, title, description, reward, isVisible, order, visibilityType, assignedUsers } = req.body
    const adminId = req.user?.id

    console.log('📥 Creating task with data:', {
      taskId,
      title,
      reward,
      isVisible,
      visibilityType,
      assignedUsersCount: assignedUsers?.length || 0,
      assignedUsers: assignedUsers
    });

    if (!taskId || !title || reward === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Task ID, title, and reward are required',
      })
    }

    // Check if taskId already exists
    const existingTask = await RewardTask.findOne({ taskId })
    if (existingTask) {
      return res.status(400).json({
        success: false,
        message: 'Task ID already exists',
      })
    }

    const newTask = new RewardTask({
      taskId,
      title,
      description: description || '',
      reward,
      isVisible: isVisible !== undefined ? isVisible : true,
      order: order || 0,
      visibilityType: visibilityType || 'all',
      assignedUsers: assignedUsers || [],
      createdBy: adminId,
    })

    await newTask.save()
    const populatedTask = await RewardTask.findById(newTask._id)
      .populate('createdBy', 'fullName email')
      .populate('assignedUsers', 'fullName email')

    res.status(201).json({
      success: true,
      message: 'Reward task created successfully',
      data: populatedTask,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating reward task',
      error: error.message,
    })
  }
}

// Admin: Update reward task
const updateRewardTask = async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, reward, isVisible, order, visibilityType, assignedUsers } = req.body

    console.log('📝 Updating task with data:', {
      id,
      title,
      reward,
      isVisible,
      visibilityType,
      assignedUsersCount: assignedUsers?.length || 0,
      assignedUsers: assignedUsers
    });

    const task = await RewardTask.findById(id)
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Reward task not found',
      })
    }

    if (title !== undefined) task.title = title
    if (description !== undefined) task.description = description
    if (reward !== undefined) task.reward = reward
    if (isVisible !== undefined) task.isVisible = isVisible
    if (order !== undefined) task.order = order
    if (visibilityType !== undefined) task.visibilityType = visibilityType
    if (assignedUsers !== undefined) task.assignedUsers = assignedUsers

    await task.save()
    const updatedTask = await RewardTask.findById(task._id)
      .populate('createdBy', 'fullName email')
      .populate('assignedUsers', 'fullName email')

    res.json({
      success: true,
      message: 'Reward task updated successfully',
      data: updatedTask,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating reward task',
      error: error.message,
    })
  }
}

// Admin: Delete reward task
const deleteRewardTask = async (req, res) => {
  try {
    const { id } = req.params

    const task = await RewardTask.findById(id)
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Reward task not found',
      })
    }

    await RewardTask.findByIdAndDelete(id)

    res.json({
      success: true,
      message: 'Reward task deleted successfully',
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error deleting reward task',
      error: error.message,
    })
  }
}

// Admin: Toggle task visibility
const toggleTaskVisibility = async (req, res) => {
  try {
    const { id } = req.params

    const task = await RewardTask.findById(id)
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Reward task not found',
      })
    }

    task.isVisible = !task.isVisible
    await task.save()

    res.json({
      success: true,
      message: `Task ${task.isVisible ? 'shown' : 'hidden'} successfully`,
      data: task,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error toggling task visibility',
      error: error.message,
    })
  }
}

module.exports = {
  getRewardTasks,
  submitRewardClaim,
  getUserRewards,
  getUserRewardRequests,
  getAllRewardRequests,
  updateRewardStatus,
  getRewardStats,
  getAllRewardTasks,
  createRewardTask,
  updateRewardTask,
  deleteRewardTask,
  toggleTaskVisibility,
}

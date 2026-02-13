const User = require('../models/User');
const SmsNotification = require('../models/SmsNotification');
const { sendBulkSMS, getBirthdayMessage, getPromotionalMessage } = require('../utils/smsService');
const moment = require('moment-timezone');


const DETROIT_TIMEZONE = 'America/Detroit';


const getTargetUsers = async (targetAudience, customUserIds = []) => {
  let query = {};
  
  switch (targetAudience) {
    case 'verified':
      query = { 
        status: 'verified', 
        phone: { $exists: true, $ne: '' },
        $or: [
          { smsOptOut: { $exists: false } }, // Users who haven't set preference (default to opted in)
          { smsOptOut: false } // Users who explicitly opted in
        ]
      };
      break;
    case 'incomplete':
      query = { 
        status: 'incomplete', 
        phone: { $exists: true, $ne: '' },
        $or: [
          { smsOptOut: { $exists: false } },
          { smsOptOut: false }
        ]
      };
      break;
    case 'custom':
      query = { 
        _id: { $in: customUserIds }, 
        phone: { $exists: true, $ne: '' },
        $or: [
          { smsOptOut: { $exists: false } },
          { smsOptOut: false }
        ]
      };
      break;
    case 'birthday':
      const detroitNow = moment.tz(DETROIT_TIMEZONE);
      const currentMonth = detroitNow.month() + 1; // moment months are 0-indexed
      const currentDay = detroitNow.date();
      
      // Handle multiple birthday data formats
      query = {
        status: 'verified',
        phone: { $exists: true, $ne: '' },
        $and: [
          // SMS opt-out filter
          {
            $or: [
              { smsOptOut: { $exists: false } },
              { smsOptOut: false }
            ]
          },
          // Birthday filter
          {
            $or: [
              // Handle numeric month/day
              {
                'birthday.month': currentMonth,
                'birthday.day': currentDay
              },
              // Handle string month/day (with leading zeros)
              {
                'birthday.month': String(currentMonth).padStart(2, '0'),
                'birthday.day': String(currentDay).padStart(2, '0')
              },
              // Handle string month/day (without leading zeros)
              {
                'birthday.month': String(currentMonth),
                'birthday.day': String(currentDay)
              },
              // Handle month names (January = 1, etc.)
              {
                'birthday.month': 'January',
                'birthday.day': currentDay
              },
              {
                'birthday.month': 'january',
                'birthday.day': currentDay
              },
              // Handle abbreviated month names
              {
                'birthday.month': 'Jan',
                'birthday.day': currentDay
              },
              {
                'birthday.month': 'jan',
                'birthday.day': currentDay
              },
              // Handle string day with numeric month
              {
                'birthday.month': currentMonth,
                'birthday.day': String(currentDay)
              },
              {
                'birthday.month': String(currentMonth),
                'birthday.day': String(currentDay).padStart(2, '0')
              }
            ]
          }
        ]
      };
      break;
    default:
      throw new Error('Invalid target audience');
  }
  
  const users = await User.find(query).select('_id fullName phone email status birthday smsOptOut');
  
  return users.map(user => ({
    userId: user._id,
    name: user.fullName,
    phone: user.phone
  }));
};


exports.sendBulkSMS = async (req, res) => {
  try {
    const { message, type, targetAudience, customUserIds } = req.body;
    
    if (!message || !type || !targetAudience) {
      return res.status(400).json({
        success: false,
        message: 'Message, type, and target audience are required'
      });
    }
    
   
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

  
    const recipients = await getTargetUsers(targetAudience, customUserIds);
    
    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No recipients found for the selected audience'
      });
    }

   
    const smsNotification = new SmsNotification({
      message,
      type,
      targetAudience,
      totalRecipients: recipients.length,
      sentBy: req.user.id, 
      status: 'sending'
    });
    
    await smsNotification.save();

   
    sendBulkSMS(recipients, message, (progress) => {
      console.log(`SMS Progress: ${progress.current}/${progress.total} - Success: ${progress.success}, Failed: ${progress.failed}`);
    }).then(async (results) => {
    
      smsNotification.recipients = results.details;
      smsNotification.successCount = results.success;
      smsNotification.failedCount = results.failed;
      smsNotification.status = 'completed';
      smsNotification.completedAt = new Date();
      await smsNotification.save();
      
      console.log(`Bulk SMS completed: ${results.success} sent, ${results.failed} failed`);
    }).catch(async (error) => {
      console.error('Bulk SMS failed:', error);
      smsNotification.status = 'failed';
      await smsNotification.save();
    });

    res.status(200).json({
      success: true,
      message: `SMS sending started to ${recipients.length} recipients`,
      notificationId: smsNotification._id,
      totalRecipients: recipients.length
    });
  } catch (error) {
    console.error('Error in sendBulkSMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk SMS',
      error: error.message
    });
  }
};


exports.getSMSHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    
    const notifications = await SmsNotification.find(query)
      .populate('sentBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await SmsNotification.countDocuments(query);
    
    res.status(200).json({
      success: true,
      notifications,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Error in getSMSHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS history',
      error: error.message
    });
  }
};


exports.getSMSDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await SmsNotification.findById(id)
      .populate('sentBy', 'fullName email')
      .populate('recipients.userId', 'fullName email phone');
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'SMS notification not found'
      });
    }
    
    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error in getSMSDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS details',
      error: error.message
    });
  }
};


exports.getSMSStats = async (req, res) => {
  try {
    const totalSent = await SmsNotification.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$successCount' } } }
    ]);
    
    const totalFailed = await SmsNotification.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$failedCount' } } }
    ]);
    
    const byType = await SmsNotification.aggregate([
      { $match: { status: 'completed' } },
      { $group: { 
        _id: '$type', 
        count: { $sum: 1 },
        totalSent: { $sum: '$successCount' }
      }}
    ]);
    
    const recentActivity = await SmsNotification.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('type successCount failedCount completedAt message')
      .populate('sentBy', 'fullName');
    
    res.status(200).json({
      success: true,
      stats: {
        totalSent: totalSent[0]?.total || 0,
        totalFailed: totalFailed[0]?.total || 0,
        byType,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error in getSMSStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS statistics',
      error: error.message
    });
  }
};


exports.previewRecipients = async (req, res) => {
  try {
    const { targetAudience, customUserIds } = req.body;
    
    if (!targetAudience) {
      return res.status(400).json({
        success: false,
        message: 'Target audience is required'
      });
    }
    
    const recipients = await getTargetUsers(targetAudience, customUserIds);
    
    res.status(200).json({
      success: true,
      count: recipients.length,
      recipients: recipients.slice(0, 50) 
    });
  } catch (error) {
    console.error('Error in previewRecipients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview recipients',
      error: error.message
    });
  }
};


exports.sendBirthdaySMSManually = async (req, res) => {
  try {
    const detroitNow = moment.tz(DETROIT_TIMEZONE);
    const currentMonth = detroitNow.month() + 1; // moment months are 0-indexed
    const currentDay = detroitNow.date();
    
    // Find birthday users with flexible month/day format matching
    const birthdayUsers = await User.find({
      status: 'verified',
      phone: { $exists: true, $ne: '' },
      $or: [
        // Handle numeric month/day
        {
          'birthday.month': currentMonth,
          'birthday.day': currentDay
        },
        // Handle string month/day (with leading zeros)
        {
          'birthday.month': String(currentMonth).padStart(2, '0'),
          'birthday.day': String(currentDay).padStart(2, '0')
        },
        // Handle string month/day (without leading zeros)
        {
          'birthday.month': String(currentMonth),
          'birthday.day': String(currentDay)
        },
        // Handle month names (January = 1, etc.)
        {
          'birthday.month': 'January',
          'birthday.day': currentDay
        },
        {
          'birthday.month': 'january',
          'birthday.day': currentDay
        },
        // Handle abbreviated month names
        {
          'birthday.month': 'Jan',
          'birthday.day': currentDay
        },
        {
          'birthday.month': 'jan',
          'birthday.day': currentDay
        },
        // Handle string day with numeric month
        {
          'birthday.month': currentMonth,
          'birthday.day': String(currentDay)
        },
        {
          'birthday.month': String(currentMonth),
          'birthday.day': String(currentDay).padStart(2, '0')
        }
      ]
    }).select('_id fullName phone email birthday');
    
    if (birthdayUsers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No birthdays today',
        totalRecipients: 0
      });
    }
    
    // Prepare recipients
    const recipients = birthdayUsers.map(user => ({
      userId: user._id,
      name: user.fullName,
      phone: user.phone
    }));
    
  
    // Create SMS notification record with sample personalized message
    const samplePersonalizedMessage = recipients.length > 0 ? getBirthdayMessage(recipients[0].name) : getBirthdayMessage('[Name]');
    const smsNotification = new SmsNotification({
      message: samplePersonalizedMessage,
      type: 'birthday',
      targetAudience: 'birthday',
      totalRecipients: recipients.length,
      sentBy: req.user.id,
      status: 'sending'
    });
    
    await smsNotification.save();
    
    // Send personalized birthday SMS to each user
    const personalizedResults = {
      total: recipients.length,
      success: 0,
      failed: 0,
      details: []
    };
    
    // Process each recipient individually with personalized message
    for (const recipient of recipients) {
      const personalizedMessage = getBirthdayMessage(recipient.name);
      
      try {
        const { sendCustomSMS } = require('../utils/smsService');
        const result = await sendCustomSMS(recipient.phone, personalizedMessage);
        
        if (result.success) {
          personalizedResults.success++;
          personalizedResults.details.push({
            userId: recipient.userId,
            phone: recipient.phone,
            name: recipient.name,
            status: 'sent',
            messageSid: result.messageSid,
            sentAt: new Date()
          });
        } else {
          personalizedResults.failed++;
          personalizedResults.details.push({
            userId: recipient.userId,
            phone: recipient.phone,
            name: recipient.name,
            status: 'failed',
            error: result.error,
            sentAt: new Date()
          });
        }
        
        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        personalizedResults.failed++;
        personalizedResults.details.push({
          userId: recipient.userId,
          phone: recipient.phone,
          name: recipient.name,
          status: 'failed',
          error: error.message,
          sentAt: new Date()
        });
      }
    }
    
    // Update notification with results - keep original birthday message
    smsNotification.recipients = personalizedResults.details;
    smsNotification.successCount = personalizedResults.success;
    smsNotification.failedCount = personalizedResults.failed;
    smsNotification.status = 'completed';
    smsNotification.completedAt = new Date();
    await smsNotification.save();
    
    console.log(`Birthday SMS completed: ${personalizedResults.success} sent, ${personalizedResults.failed} failed`);
    
    res.status(200).json({
      success: true,
      message: `Birthday SMS sending started to ${recipients.length} users`,
      notificationId: smsNotification._id,
      totalRecipients: recipients.length
    });
  } catch (error) {
    console.error('Error in sendBirthdaySMSManually:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send birthday SMS',
      error: error.message
    });
  }
};


exports.previewBirthdayUsers = async (req, res) => {
  try {
    const detroitNow = moment.tz(DETROIT_TIMEZONE);
    const currentMonth = detroitNow.month() + 1; // moment months are 0-indexed
    const currentDay = detroitNow.date();
    
    const birthdayUsers = await User.find({
      status: 'verified',
      phone: { $exists: true, $ne: '' },
      $or: [
        // Handle numeric month/day
        {
          'birthday.month': currentMonth,
          'birthday.day': currentDay
        },
        // Handle string month/day (with leading zeros)
        {
          'birthday.month': String(currentMonth).padStart(2, '0'),
          'birthday.day': String(currentDay).padStart(2, '0')
        },
        // Handle string month/day (without leading zeros)
        {
          'birthday.month': String(currentMonth),
          'birthday.day': String(currentDay)
        },
      
        {
          'birthday.month': 'January',
          'birthday.day': currentDay
        },
        {
          'birthday.month': 'january',
          'birthday.day': currentDay
        },
       
        {
          'birthday.month': 'Jan',
          'birthday.day': currentDay
        },
        {
          'birthday.month': 'jan',
          'birthday.day': currentDay
        }
      ]
    }).select('fullName phone email birthday');
    
    const sampleMessage = birthdayUsers.length > 0 ? getBirthdayMessage(birthdayUsers[0].fullName) : getBirthdayMessage('[Name]');
    
    res.status(200).json({
      success: true,
      count: birthdayUsers.length,
      users: birthdayUsers,
      message: sampleMessage
    });
  } catch (error) {
    console.error('Error in previewBirthdayUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview birthday users',
      error: error.message
    });
  }
};


exports.searchUsers = async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search || search.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const users = await User.find({
      $or: [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ],
      phone: { $exists: true, $ne: '' }
    })
    .select('_id fullName phone email status')
    .limit(50); 
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error in searchUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
};


exports.sendIndividualSMS = async (req, res) => {
  try {
    const { userId, message, messageType } = req.body;
    
    if (!userId || !message || !messageType) {
      return res.status(400).json({
        success: false,
        message: 'User ID, message, and message type are required'
      });
    }
    
   
    const user = await User.findById(userId).select('fullName phone email status');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.phone) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a phone number'
      });
    }
    
    
    const smsNotification = new SmsNotification({
      message,
      type: messageType,
      targetAudience: 'custom',
      totalRecipients: 1,
      sentBy: req.user.id,
      status: 'sending'
    });
    
    await smsNotification.save();
    
   
    const { sendCustomSMS } = require('../utils/smsService');
    const result = await sendCustomSMS(user.phone, message);
    
    
    smsNotification.recipients = [{
      userId: user._id,
      phone: user.phone,
      name: user.fullName,
      status: result.success ? 'sent' : 'failed',
      messageSid: result.messageSid,
      error: result.error,
      sentAt: new Date()
    }];
    smsNotification.successCount = result.success ? 1 : 0;
    smsNotification.failedCount = result.success ? 0 : 1;
    smsNotification.status = 'completed';
    smsNotification.completedAt = new Date();
    await smsNotification.save();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: `SMS sent successfully to ${user.fullName}`,
        notificationId: smsNotification._id
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send SMS',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendIndividualSMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send individual SMS',
      error: error.message
    });
  }
};

// Send SMS to all Topia Circle Members
exports.sendToTopiaMembers = async (req, res) => {
  try {
    const { message, selectedMembers } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    let query = {
      isTopiaCircleMember: true,
      subscriptionStatus: 'active',
      phone: { $exists: true, $ne: '' },
      $or: [
        { smsOptOut: { $exists: false } },
        { smsOptOut: false }
      ]
    };

    if (selectedMembers && selectedMembers.length > 0) {
      query._id = { $in: selectedMembers };
    }
    
    const topiaMembers = await User.find(query).select('_id fullName phone email');
    
    if (topiaMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No Topia Circle members found'
      });
    }
    
    // Prepare recipients
    const recipients = topiaMembers.map(member => ({
      userId: member._id,
      name: member.fullName,
      phone: member.phone
    }));
    
    // Create SMS notification record
    const smsNotification = new SmsNotification({
      message,
      type: 'topia_circle',
      targetAudience: 'topia_members',
      totalRecipients: recipients.length,
      sentBy: req.user.id,
      status: 'sending'
    });
    
    await smsNotification.save();
    
    // Send SMS to all members
    sendBulkSMS(recipients, message, (progress) => {
      console.log(`Topia SMS Progress: ${progress.current}/${progress.total} - Success: ${progress.success}, Failed: ${progress.failed}`);
    }).then(async (results) => {
      smsNotification.recipients = results.details;
      smsNotification.successCount = results.success;
      smsNotification.failedCount = results.failed;
      smsNotification.status = 'completed';
      smsNotification.completedAt = new Date();
      await smsNotification.save();
      
      console.log(`Topia Circle SMS completed: ${results.success} sent, ${results.failed} failed`);
    }).catch(async (error) => {
      console.error('Topia Circle SMS failed:', error);
      smsNotification.status = 'failed';
      await smsNotification.save();
    });
    
    res.status(200).json({
      success: true,
      message: `SMS sending started to ${recipients.length} Topia Circle members`,
      notificationId: smsNotification._id,
      totalMembers: recipients.length,
      successCount: 0,
      failureCount: 0
    });
  } catch (error) {
    console.error('Error in sendToTopiaMembers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send SMS to Topia members',
      error: error.message
    });
  }
};

// Preview Topia Circle Members
exports.previewTopiaMembers = async (req, res) => {
  try {
    const topiaMembers = await User.find({
      isTopiaCircleMember: true,
      subscriptionStatus: 'active',
      phone: { $exists: true, $ne: '' },
      $or: [
        { smsOptOut: { $exists: false } },
        { smsOptOut: false }
      ]
    }).select('fullName phone email subscriptionStatus');
    
    res.status(200).json({
      success: true,
      count: topiaMembers.length,
      members: topiaMembers
    });
  } catch (error) {
    console.error('Error in previewTopiaMembers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview Topia members',
      error: error.message
    });
  }
};


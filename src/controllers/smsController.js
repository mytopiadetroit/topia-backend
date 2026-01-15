const User = require('../models/User');
const SmsNotification = require('../models/SmsNotification');
const { sendBulkSMS, getBirthdayMessage, getPromotionalMessage } = require('../utils/smsService');
const moment = require('moment-timezone');


const DETROIT_TIMEZONE = 'America/Detroit';


const getTargetUsers = async (targetAudience, customUserIds = []) => {
  let query = {};
  
  switch (targetAudience) {
    case 'verified':
      query = { status: 'verified', phone: { $exists: true, $ne: '' } };
      break;
    case 'incomplete':
      query = { status: 'incomplete', phone: { $exists: true, $ne: '' } };
      break;
    case 'custom':
      query = { _id: { $in: customUserIds }, phone: { $exists: true, $ne: '' } };
      break;
    case 'birthday':
     
      const detroitNow = moment.tz(DETROIT_TIMEZONE);
      const month = String(detroitNow.month() + 1);
      const day = String(detroitNow.date());
      query = {
        status: 'verified',
        'birthday.month': month,
        'birthday.day': day,
        phone: { $exists: true, $ne: '' }
      };
      break;
    default:
      throw new Error('Invalid target audience');
  }
  
  const users = await User.find(query).select('_id fullName phone email status');
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
    console.log(' Manual birthday SMS triggered by admin...');
    
    const detroitNow = moment.tz(DETROIT_TIMEZONE);
    const month = String(detroitNow.month() + 1);
    const day = String(detroitNow.date());
    
    console.log(`Checking birthdays for Detroit date: ${detroitNow.format('YYYY-MM-DD')}`);
    
   
    const birthdayUsers = await User.find({
      status: 'verified',
      'birthday.month': month,
      'birthday.day': day,
      phone: { $exists: true, $ne: '' }
    }).select('_id fullName phone email');
    
    if (birthdayUsers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No birthdays today',
        totalRecipients: 0
      });
    }
    
    console.log(`Found ${birthdayUsers.length} birthday users`);
    
   
    const recipients = birthdayUsers.map(user => ({
      userId: user._id,
      name: user.fullName,
      phone: user.phone
    }));
    
  
    const smsNotification = new SmsNotification({
      message: getBirthdayMessage('[Name]'),
      type: 'birthday',
      targetAudience: 'birthday',
      totalRecipients: recipients.length,
      sentBy: req.user.id,
      status: 'sending'
    });
    
    await smsNotification.save();
    
   
    sendBulkSMS(recipients, '', async (progress) => {
      console.log(`Birthday SMS Progress: ${progress.current}/${progress.total}`);
    }).then(async (results) => {
    
      const personalizedResults = {
        total: recipients.length,
        success: 0,
        failed: 0,
        details: []
      };
      
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
      
      smsNotification.recipients = personalizedResults.details;
      smsNotification.successCount = personalizedResults.success;
      smsNotification.failedCount = personalizedResults.failed;
      smsNotification.status = 'completed';
      smsNotification.completedAt = new Date();
      await smsNotification.save();
      
      console.log(` Manual birthday SMS completed: ${personalizedResults.success} sent, ${personalizedResults.failed} failed`);
    }).catch(async (error) => {
      console.error(' Manual birthday SMS failed:', error);
      smsNotification.status = 'failed';
      await smsNotification.save();
    });
    
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
    const month = String(detroitNow.month() + 1);
    const day = String(detroitNow.date());
    
    console.log(`Previewing birthdays for Detroit date: ${detroitNow.format('YYYY-MM-DD')}`);
    
    const birthdayUsers = await User.find({
      status: 'verified',
      'birthday.month': month,
      'birthday.day': day,
      phone: { $exists: true, $ne: '' }
    }).select('fullName phone email birthday');
    
    res.status(200).json({
      success: true,
      count: birthdayUsers.length,
      users: birthdayUsers
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

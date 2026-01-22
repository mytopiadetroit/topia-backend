const SmsReply = require('../models/SmsReply');
const User = require('../models/User');
const { sendCustomSMS } = require('../utils/smsService');


exports.receiveSmsReply = async (req, res) => {
  try {
    const {
      MessageSid,
      From,
      To,
      Body,
      AccountSid,
      MessagingServiceSid,
      NumMedia,
      NumSegments,
      SmsStatus,
      ApiVersion
    } = req.body;

    console.log('Received SMS reply:', {
      MessageSid,
      From,
      To,
      Body: Body?.substring(0, 100) + (Body?.length > 100 ? '...' : ''),
      SmsStatus
    });

    // Normalize phone number (remove +1 if present for US numbers)
    const normalizedPhone = From.replace(/^\+1/, '').replace(/\D/g, '');
    
    // Find user by phone number
    const user = await User.findOne({
      $or: [
        { phone: From },
        { phone: normalizedPhone },
        { phone: `+1${normalizedPhone}` },
        { phone: From.replace(/^\+/, '') }
      ]
    }).select('_id fullName phone email status');

    // Create SMS reply record
    const smsReply = new SmsReply({
      messageSid: MessageSid,
      from: From,
      to: To,
      body: Body || '',
      user: user?._id || null,
      userPhone: From,
      userName: user?.fullName || null,
      twilioData: {
        accountSid: AccountSid,
        messagingServiceSid: MessagingServiceSid,
        numMedia: NumMedia || 0,
        numSegments: NumSegments || 1,
        smsStatus: SmsStatus,
        apiVersion: ApiVersion
      }
    });

    await smsReply.save();

    // Handle opt-out requests automatically
    if (smsReply.isOptOut && user) {
      try {
        // Update user's SMS preferences (you might want to add this field to User model)
        await User.findByIdAndUpdate(user._id, {
          $set: { 
            smsOptOut: true,
            smsOptOutDate: new Date()
          }
        });

        // Send confirmation message
        const confirmationMessage = "You have been unsubscribed from SMS notifications. Reply START to opt back in. - Shroomtopia";
        await sendCustomSMS(From, confirmationMessage);

        // Update reply status
        smsReply.status = 'processed';
        smsReply.processedAt = new Date();
        smsReply.adminResponse = {
          message: confirmationMessage,
          sentAt: new Date()
        };
        await smsReply.save();

        console.log(`User ${user.fullName} (${From}) opted out of SMS notifications`);
      } catch (error) {
        console.error('Error processing opt-out:', error);
      }
    }

    // Handle opt-in requests
    if (smsReply.messageType === 'opt_in' && user) {
      try {
        await User.findByIdAndUpdate(user._id, {
          $unset: { 
            smsOptOut: 1,
            smsOptOutDate: 1
          }
        });

        const confirmationMessage = "Welcome back! You're now subscribed to SMS notifications from Shroomtopia. Reply STOP to unsubscribe.";
        await sendCustomSMS(From, confirmationMessage);

        smsReply.status = 'processed';
        smsReply.processedAt = new Date();
        smsReply.adminResponse = {
          message: confirmationMessage,
          sentAt: new Date()
        };
        await smsReply.save();

        console.log(`User ${user.fullName} (${From}) opted back into SMS notifications`);
      } catch (error) {
        console.error('Error processing opt-in:', error);
      }
    }

    // Respond to Twilio with empty TwiML to acknowledge receipt
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (error) {
    console.error('Error processing SMS reply webhook:', error);
    
    // Still respond to Twilio to avoid retries
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
};


exports.getSmsReplies = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      messageType, 
      status, 
      search,
      startDate,
      endDate 
    } = req.query;

    // Build query
    const query = {};
    
    if (messageType && messageType !== 'all') {
      query.messageType = messageType;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { body: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userPhone: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.receivedAt = {};
      if (startDate) query.receivedAt.$gte = new Date(startDate);
      if (endDate) query.receivedAt.$lte = new Date(endDate);
    }

    const replies = await SmsReply.find(query)
      .populate('user', 'fullName email phone status')
      .populate('adminResponse.sentBy', 'fullName email')
      .sort({ receivedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await SmsReply.countDocuments(query);

    res.status(200).json({
      success: true,
      replies,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });

  } catch (error) {
    console.error('Error fetching SMS replies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS replies',
      error: error.message
    });
  }
};


exports.getSmsReplyStats = async (req, res) => {
  try {
    const totalReplies = await SmsReply.countDocuments();
    
    const byType = await SmsReply.aggregate([
      {
        $group: {
          _id: '$messageType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const byStatus = await SmsReply.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const optOutCount = await SmsReply.countDocuments({ isOptOut: true });
    
    const recentReplies = await SmsReply.find()
      .populate('user', 'fullName phone')
      .sort({ receivedAt: -1 })
      .limit(10)
      .select('body userName userPhone messageType receivedAt');

    // Get daily reply counts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await SmsReply.aggregate([
      {
        $match: {
          receivedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$receivedAt"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalReplies,
        optOutCount,
        byType,
        byStatus,
        recentReplies,
        dailyStats
      }
    });

  } catch (error) {
    console.error('Error fetching SMS reply stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS reply statistics',
      error: error.message
    });
  }
};


exports.respondToSmsReply = async (req, res) => {
  try {
    const { replyId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    const smsReply = await SmsReply.findById(replyId);
    if (!smsReply) {
      return res.status(404).json({
        success: false,
        message: 'SMS reply not found'
      });
    }

    // Send response via Twilio
    const result = await sendCustomSMS(smsReply.from, message.trim());

    if (result.success) {
      // Update the reply record
      smsReply.adminResponse = {
        message: message.trim(),
        sentAt: new Date(),
        sentBy: req.user.id
      };
      smsReply.status = 'responded';
      await smsReply.save();

      res.status(200).json({
        success: true,
        message: 'Response sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send response',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error responding to SMS reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send response',
      error: error.message
    });
  }
};


exports.updateSmsReplyStatus = async (req, res) => {
  try {
    const { replyId } = req.params;
    const { status } = req.body;

    if (!['received', 'processed', 'responded', 'ignored'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const smsReply = await SmsReply.findByIdAndUpdate(
      replyId,
      { 
        status,
        processedAt: status === 'processed' ? new Date() : undefined
      },
      { new: true }
    );

    if (!smsReply) {
      return res.status(404).json({
        success: false,
        message: 'SMS reply not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      reply: smsReply
    });

  } catch (error) {
    console.error('Error updating SMS reply status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};


exports.getSmsReplyDetails = async (req, res) => {
  try {
    const { replyId } = req.params;

    const reply = await SmsReply.findById(replyId)
      .populate('user', 'fullName email phone status createdAt')
      .populate('adminResponse.sentBy', 'fullName email');

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'SMS reply not found'
      });
    }

    res.status(200).json({
      success: true,
      reply
    });

  } catch (error) {
    console.error('Error fetching SMS reply details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS reply details',
      error: error.message
    });
  }
};
const cron = require('node-cron');
const User = require('../models/User');
const SmsNotification = require('../models/SmsNotification');
const { sendBulkSMS, getBirthdayMessage } = require('./smsService');
const moment = require('moment-timezone');


const DETROIT_TIMEZONE = 'America/Detroit';


const scheduleBirthdaySMS = () => {
 
  cron.schedule('0 9 * * *', async () => {
    console.log('🎂 Running birthday SMS cron job...');
    
    try {
   
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
        console.log('No birthdays today');
        return;
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
        sentBy: null, // System generated
        status: 'sending'
      });
      
      await smsNotification.save();
      
     
      const results = {
        total: recipients.length,
        success: 0,
        failed: 0,
        details: []
      };
      
      for (const recipient of recipients) {
        const personalizedMessage = getBirthdayMessage(recipient.name);
        
        try {
          const { sendCustomSMS } = require('./smsService');
          const result = await sendCustomSMS(recipient.phone, personalizedMessage);
          
          if (result.success) {
            results.success++;
            results.details.push({
              userId: recipient.userId,
              phone: recipient.phone,
              name: recipient.name,
              status: 'sent',
              messageSid: result.messageSid,
              sentAt: new Date()
            });
          } else {
            results.failed++;
            results.details.push({
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
          results.failed++;
          results.details.push({
            userId: recipient.userId,
            phone: recipient.phone,
            name: recipient.name,
            status: 'failed',
            error: error.message,
            sentAt: new Date()
          });
        }
      }
      
    
      smsNotification.recipients = results.details;
      smsNotification.successCount = results.success;
      smsNotification.failedCount = results.failed;
      smsNotification.status = 'completed';
      smsNotification.completedAt = new Date();
      await smsNotification.save();
      
      console.log(`Birthday SMS completed: ${results.success} sent, ${results.failed} failed`);
    } catch (error) {
      console.error('Birthday SMS cron job failed:', error);
    }
  }, {
    timezone: DETROIT_TIMEZONE
  });
  
  console.log(` Birthday SMS cron job scheduled (9 AM daily - ${DETROIT_TIMEZONE})`);
};

module.exports = {
  scheduleBirthdaySMS
};

const twilio = require('twilio')


if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.error('Twilio environment variables are not properly set');
  console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not Set');
  console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'Not Set');
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)


const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}


const isValidUSNumber = (phoneNumber) => {
  
  const digits = phoneNumber.replace(/\D/g, '');
  
 
  return /^1?\d{10}$/.test(digits);
}


const formatPhoneNumber = (phoneNumber) => {
 
  const digits = phoneNumber.replace(/\D/g, '');
  
 
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
 
  return phoneNumber;
}


const sendOTP = async (phoneNumber) => {
  try {
   
    if (!isValidUSNumber(phoneNumber)) {
      return { 
        success: false, 
        error: 'Only US and Canada phone numbers are currently supported. Please use a valid US/Canada number.',
        code: 'INVALID_NUMBER_FORMAT',
        status: 400
      };
    }

    const otp = generateOTP()
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    console.log('Sending OTP to:', formattedNumber);
    console.log('From number:', process.env.TWILIO_PHONE_NUMBER);
    
    const message = await client.messages.create({
      body: `Your Shroomtopia verification code is: ${otp}. This code will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber
    })
    
    console.log(`OTP sent to ${formattedNumber}. Message SID: ${message.sid}`)
    return { 
      success: true, 
      otp, 
      messageSid: message.sid,
      formattedNumber
    }
  } catch (error) {
    console.error('❌ Error sending OTP:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('More Info:', error.moreInfo);
    console.error('Status:', error.status);
    
    
    let errorMessage = error.message;
    if (error.code === 21211 || error.code === 21408) {
      errorMessage = 'This phone number is not supported. Please use a valid US or Canada number.';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      code: error.code || 'SMS_SEND_FAILED',
      status: error.status || 500
    }
  }
}


const sendCustomSMS = async (phoneNumber, message) => {
  try {
    if (!isValidUSNumber(phoneNumber)) {
      return { 
        success: false, 
        error: 'Only US and Canada phone numbers are currently supported.',
        code: 'INVALID_NUMBER_FORMAT',
        status: 400
      };
    }

    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    const twilioMessage = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });
    
    console.log(`SMS sent to ${formattedNumber}. Message SID: ${twilioMessage.sid}`);
    return { 
      success: true, 
      messageSid: twilioMessage.sid,
      formattedNumber
    };
  } catch (error) {
    console.error(' Error sending SMS:', error.message);
    
    let errorMessage = error.message;
    if (error.code === 21211 || error.code === 21408) {
      errorMessage = 'This phone number is not supported. Please use a valid US or Canada number.';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      code: error.code || 'SMS_SEND_FAILED',
      status: error.status || 500
    };
  }
};


const sendBulkSMS = async (recipients, message, onProgress) => {
  const results = {
    total: recipients.length,
    success: 0,
    failed: 0,
    details: []
  };

  
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    try {
      const result = await sendCustomSMS(recipient.phone, message);
      
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
      
   
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: recipients.length,
          success: results.success,
          failed: results.failed
        });
      }
      
     
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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

  return results;
};


const getBirthdayMessage = (userName) => {
  return `🎉 Happy Birthday ${userName}! 🎂 Claim your special birthday gift at Shroomtopia today! Visit us or reply to redeem. - Shroomtopia Team`;
};


const getPromotionalMessage = (customMessage) => {
  return `${customMessage} - Shroomtopia`;
};

module.exports = {
  generateOTP,
  sendOTP,
  sendCustomSMS,
  sendBulkSMS,
  getBirthdayMessage,
  getPromotionalMessage,
  formatPhoneNumber,
  isValidUSNumber
}
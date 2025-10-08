const twilio = require('twilio')

// Initialize Twilio client
// Validate environment variables
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.error('Twilio environment variables are not properly set');
  console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not Set');
  console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'Not Set');
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP via SMS
const sendOTP = async (phoneNumber) => {
  try {
    const otp = generateOTP()
    
    console.log('Sending OTP to:', phoneNumber);
    console.log('From number:', process.env.TWILIO_PHONE_NUMBER);
    
    const message = await client.messages.create({
      body: `Your Shroomtopia verification code is: ${otp}. This code will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })
    
    console.log(`OTP sent to ${phoneNumber}. Message SID: ${message.sid}`)
    return { success: true, otp, messageSid: message.sid }
  } catch (error) {
    console.error('❌ Error sending OTP:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('More Info:', error.moreInfo);
    console.error('Status:', error.status);
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      status: error.status
    }
  }
}

module.exports = {
  generateOTP,
  sendOTP
}

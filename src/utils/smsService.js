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

// Validate US phone number format
const isValidUSNumber = (phoneNumber) => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a valid US number (10 digits or 11 digits starting with 1)
  return /^1?\d{10}$/.test(digits);
}

// Format phone number to E.164 format
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it's 10 digits, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it's 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Otherwise, assume it's already in E.164 format
  return phoneNumber;
}

// Send OTP via SMS
const sendOTP = async (phoneNumber) => {
  try {
    // First validate the phone number
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
    
    // Provide a more user-friendly error message for unsupported regions
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

module.exports = {
  generateOTP,
  sendOTP
}
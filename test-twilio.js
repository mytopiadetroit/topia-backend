require('dotenv').config();
const { sendOTP } = require('./src/utils/smsService');

// Test phone number (include country code, e.g., +1 for US)
const testPhoneNumber = '+919999999999'; // Replace with your test number

async function testTwilio() {
  console.log('Testing Twilio OTP...');
  console.log(`Sending OTP to: ${testPhoneNumber}`);
  
  try {
    const result = await sendOTP(testPhoneNumber);
    
    if (result.success) {
      console.log('✅ OTP sent successfully!');
      console.log('OTP:', result.otp);
      console.log('Message SID:', result.messageSid);
    } else {
      console.error('❌ Failed to send OTP:');
      console.error(result.error);
    }
  } catch (error) {
    console.error('❌ Error in test script:');
    console.error(error);
  }
}

// Run the test
testTwilio().then(() => {
  console.log('Test completed');  
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

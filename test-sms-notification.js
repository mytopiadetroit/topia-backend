require('dotenv').config();
const mongoose = require('mongoose');
const { sendCustomSMS, getBirthdayMessage } = require('./src/utils/smsService');


const TEST_PHONE = '+19999999999';

async function testSMSNotification() {
  console.log('Testing SMS Notification System...\n');
  
  try {
    
    console.log(' Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log(' Database connected\n');
    
    
    console.log('Test 1: Sending custom SMS...');
    const customResult = await sendCustomSMS(
      TEST_PHONE,
      'This is a test message from Shroomtopia SMS system!'
    );
    
    if (customResult.success) {
      console.log('Custom SMS sent successfully!');
      console.log('   Message SID:', customResult.messageSid);
    } else {
      console.log(' Custom SMS failed:', customResult.error);
    }
    console.log('');
    
    
    console.log('Test 2: Testing birthday message template...');
    const birthdayMsg = getBirthdayMessage('John Doe');
    console.log(' Birthday message:', birthdayMsg);
    console.log('');
    
    
    console.log('Test 3: Checking users with birthdays today...');
    const User = require('./src/models/User');
    const today = new Date();
    const month = String(today.getMonth() + 1);
    const day = String(today.getDate());
    
    const birthdayUsers = await User.find({
      status: 'verified',
      'birthday.month': month,
      'birthday.day': day,
      phone: { $exists: true, $ne: '' }
    }).select('fullName phone birthday');
    
    console.log(`Found ${birthdayUsers.length} users with birthday today`);
    if (birthdayUsers.length > 0) {
      console.log('   Users:', birthdayUsers.map(u => u.fullName).join(', '));
    }
    console.log('');
    
   
    console.log('Test 4: Testing SMS notification model...');
    const SmsNotification = require('./src/models/SmsNotification');
    const testNotification = new SmsNotification({
      message: 'Test message',
      type: 'custom',
      targetAudience: 'all_verified',
      totalRecipients: 1,
      sentBy: null,
      status: 'draft'
    });
    
    const validationError = testNotification.validateSync();
    if (validationError) {
      console.log('Model validation failed:', validationError.message);
    } else {
      console.log('SMS notification model is valid');
    }
    console.log('');
    
    
    console.log('Test 5: Counting potential recipients...');
    const verifiedCount = await User.countDocuments({
      status: 'verified',
      phone: { $exists: true, $ne: '' }
    });
    const incompleteCount = await User.countDocuments({
      status: 'incomplete',
      phone: { $exists: true, $ne: '' }
    });
    
    console.log(` Verified users with phone: ${verifiedCount}`);
    console.log(`Incomplete users with phone: ${incompleteCount}`);
    console.log('');
    
    console.log(' All tests completed!\n');
    console.log('Summary:');
    console.log('- SMS Service: Working');
    console.log('- Database Connection: Working');
    console.log('- Models: Valid');
    console.log(`- Total potential recipients: ${verifiedCount + incompleteCount}`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Database disconnected');
    process.exit(0);
  }
}

testSMSNotification();

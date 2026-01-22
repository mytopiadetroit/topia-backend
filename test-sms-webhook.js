const axios = require('axios');


async function testSMSWebhook() {
  const webhookUrl = 'http://localhost:5000/api/sms-replies/webhook';
  
  const testData = {
    MessageSid: 'SM' + Math.random().toString(36).substr(2, 32),
    From: '+13135551234', 
    To: '+13135727657',   
    Body: 'Hello! I want to know about your products',
    AccountSid: process.env.TWILIO_ACCOUNT_SID || 'AC123456789',
    MessagingServiceSid: null,
    NumMedia: '0',
    NumSegments: '1',
    SmsStatus: 'received',
    ApiVersion: '2010-04-01'
  };

  try {
    console.log('Testing SMS webhook endpoint...');
    console.log('URL:', webhookUrl);
    console.log('Test data:', testData);
    
    const response = await axios.post(webhookUrl, testData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Webhook test successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Webhook test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}


async function testOptOutMessage() {
  const webhookUrl = 'http://localhost:5000/api/sms-replies/webhook';
  
  const testData = {
    MessageSid: 'SM' + Math.random().toString(36).substr(2, 32),
    From: '+13135551234', 
    To: '+13135727657',   
    Body: 'STOP',        
    AccountSid: process.env.TWILIO_ACCOUNT_SID || 'AC123456789',
    MessagingServiceSid: null,
    NumMedia: '0',
    NumSegments: '1',
    SmsStatus: 'received',
    ApiVersion: '2010-04-01'
  };

  try {
    console.log('\nTesting opt-out message...');
    const response = await axios.post(webhookUrl, testData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Opt-out test successful!');
    console.log('Status:', response.status);
    
  } catch (error) {
    console.error('Opt-out test failed:', error.message);
  }
}


async function runTests() {
 
  await testSMSWebhook();
  await testOptOutMessage();
  
  console.log('\nTests completed!');
  console.log('\nTesting Steps:');
  
}

if (require.main === module) {
  runTests();
}

module.exports = { testSMSWebhook, testOptOutMessage };
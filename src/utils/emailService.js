const sgMail = require('@sendgrid/mail')

// Set SendGrid API key
if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY is not set in environment variables')
  process.exit(1)
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY)
console.log('SendGrid API key set. Sender email:', process.env.SENDGRID_SENDER_EMAIL)

const sendWelcomeEmail = async (email, firstName) => {
  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_SENDER_EMAIL,
      subject: '✅ You\'re Officially a Member of Shroomtopia',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4CAF50;">Welcome to Shroomtopia!</h1>
          </div>
          
          <div style="margin-bottom: 25px;">
            <p>Hey ${firstName},</p>
            <p>Welcome aboard! You've successfully registered with Shroomtopia.</p>
            <p>You now have full access to:</p>
            <ul style="padding-left: 20px;">
              <li>Our full catalog of therapeutic mushrooms & natural products</li>
              <li>Exclusive member deals</li>
              <li>Personalized wellness support from our team</li>
            </ul>
          </div>
          
          <p>We're proud to serve the Detroit community with trusted, affordable, and transformative natural goods.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://main.d2hdxwwdjspab.amplifyapp.com/" 
               style="display: inline-block; background-color: #4CAF50; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 4px; 
                      font-weight: bold; font-size: 16px;">
              🌱 Start Exploring Now
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666;">
            <p>Thank you for joining Shroomtopia!</p>
            <p>If you have any questions, feel free to reply to this email.</p>
          </div>
        </div>
      `
    }

    const response = await sgMail.send(msg)
    console.log('Welcome email sent to', email, 'Response:', response[0].statusCode)
    return { success: true, message: 'Email sent successfully' }
  } catch (error) {
    console.error('Error sending welcome email to', email)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body,
      stack: error.stack
    })
    return { 
      success: false, 
      message: 'Failed to send email',
      error: error.message 
    }
  }
}

module.exports = {
  sendWelcomeEmail
}

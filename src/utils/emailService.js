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
            <a href="https://www.mypsyguide.io/" 
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

const sendAccountSuspendedEmail = async (email, firstName, reason = '') => {
  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_SENDER_EMAIL,
      subject: '⚠️ Your Shroomtopia Account Has Been Suspended',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #f44336;">Account Suspended</h1>
          </div>
          
          <div style="margin-bottom: 25px;">
            <p>Dear ${firstName},</p>
            <p>We regret to inform you that your Shroomtopia account has been suspended.</p>
            
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            
            <p>During this time, you will not be able to access your account or make any purchases.</p>
            
            <p>If you believe this is a mistake, please contact our support team immediately.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:Mytopiadetroit@gmail.com" 
               style="display: inline-block; background-color: #f44336; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 4px; 
                      font-weight: bold; font-size: 16px;">
              📧 Contact Support
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666;">
            <p>Thank you for your understanding.</p>
            <p>Shroomtopia Support Team</p>
          </div>
        </div>
      `
    }

    const response = await sgMail.send(msg)
    console.log('Account suspended email sent to', email, 'Response:', response[0].statusCode)
    return { success: true, message: 'Suspension email sent successfully' }
  } catch (error) {
    console.error('Error sending account suspended email to', email, 'Error:', error.message)
    return { 
      success: false, 
      message: 'Failed to send suspension email',
      error: error.message 
    }
  }
}

const sendAccountVerifiedEmail = async (email, firstName) => {
  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_SENDER_EMAIL,
      subject: '✅ Your Shroomtopia Account Has Been Verified',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4CAF50;">Account Verified!</h1>
          </div>
          
          <div style="margin-bottom: 25px;">
            <p>Hello ${firstName},</p>
            <p>Great news! Your Shroomtopia account has been successfully verified.</p>
            <p>You now have full access to all features including:</p>
            <ul style="padding-left: 20px;">
              <li>Complete product catalog</li>
              <li>Exclusive member discounts</li>
              <li>Fast checkout options</li>
              <li>Discover the power of therapeutic
mushrooms today</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.mypsyguide.io/" 
               style="display: inline-block; background-color: #4CAF50; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 4px; 
                      font-weight: bold; font-size: 16px;">
              🛍️ Start Shopping Now
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666;">
            <p>Thank you for choosing Shroomtopia!</p>
            <p>If you have any questions, feel free to reply to this email.</p>
          </div>
        </div>
      `
    }

    const response = await sgMail.send(msg)
    console.log('Account verified email sent to', email, 'Response:', response[0].statusCode)
    return { success: true, message: 'Verification email sent successfully' }
  } catch (error) {
    console.error('Error sending account verified email to', email, 'Error:', error.message)
    return { 
      success: false, 
      message: 'Failed to send verification email',
      error: error.message 
    }
  }
}

module.exports = {
  sendWelcomeEmail,
  sendAccountSuspendedEmail,
  sendAccountVerifiedEmail
}

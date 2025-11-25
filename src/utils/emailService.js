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

const sendRewardApprovedEmail = async (email, firstName, taskTitle, rewardAmount) => {
  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_SENDER_EMAIL,
      subject: '🎉 Your Reward Has Been Approved!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div style="background: white; border-radius: 8px; padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 60px; margin-bottom: 10px;">🎉</div>
              <h1 style="color: #667eea; margin: 0; font-size: 28px;">Congratulations!</h1>
              <p style="color: #666; margin-top: 10px; font-size: 16px;">Your reward has been approved</p>
            </div>
            
            <div style="background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; color: #333;"><strong>Hey ${firstName}! 👋</strong></p>
              <p style="margin: 0; color: #666; line-height: 1.6;">
                Great news! Your reward request for <strong style="color: #667eea;">"${taskTitle}"</strong> has been approved by our team.
              </p>
            </div>
            
            <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <p style="color: white; margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Reward Amount</p>
              <p style="color: white; margin: 0; font-size: 48px; font-weight: bold;">$${rewardAmount}</p>
              <p style="color: white; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Added to your account</p>
            </div>
            
            <div style="background: #fff9e6; border: 1px solid #ffd700; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
              <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                <strong>💡 What's Next?</strong><br>
                Your reward points have been added to your account balance. You can use them for discounts on your next purchase or save them up for bigger rewards!
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.mypsyguide.io/rewards" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; 
                        padding: 14px 32px; text-decoration: none; border-radius: 25px; 
                        font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                🎁 View My Rewards
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
                <strong>Keep earning more rewards!</strong>
              </p>
              <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                Complete more tasks to earn additional rewards. Check out our rewards page to see what other exciting opportunities are waiting for you.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #999; font-size: 12px;">Thank you for being part of Shroomtopia!</p>
              <p style="margin: 0; color: #999; font-size: 12px;">Questions? Reply to this email anytime.</p>
            </div>
          </div>
        </div>
      `
    }

    const response = await sgMail.send(msg)
    console.log('Reward approved email sent to', email, 'Response:', response[0].statusCode)
    return { success: true, message: 'Reward approval email sent successfully' }
  } catch (error) {
    console.error('Error sending reward approved email to', email, 'Error:', error.message)
    return { 
      success: false, 
      message: 'Failed to send reward approval email',
      error: error.message 
    }
  }
}

const sendRewardRejectedEmail = async (email, firstName, taskTitle, adminNotes = '') => {
  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_SENDER_EMAIL,
      subject: '❌ Reward Request Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 50px; margin-bottom: 10px;">😔</div>
            <h1 style="color: #f44336; margin: 0;">Reward Request Not Approved</h1>
          </div>
          
          <div style="margin-bottom: 25px;">
            <p>Hello ${firstName},</p>
            <p>We've reviewed your reward request for <strong>"${taskTitle}"</strong>, and unfortunately, we're unable to approve it at this time.</p>
            
            ${adminNotes ? `
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 5px 0; color: #856404;"><strong>Reason:</strong></p>
                <p style="margin: 0; color: #856404;">${adminNotes}</p>
              </div>
            ` : ''}
            
            <p>Don't worry! You can still earn rewards by:</p>
            <ul style="padding-left: 20px; color: #666;">
              <li>Completing other available tasks</li>
              <li>Resubmitting this task with proper proof</li>
              <li>Checking our rewards page for new opportunities</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.mypsyguide.io/rewards" 
               style="display: inline-block; background-color: #667eea; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 4px; 
                      font-weight: bold; font-size: 16px;">
              🎁 View Available Rewards
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666;">
            <p>If you have any questions about this decision, please don't hesitate to contact our support team.</p>
            <p style="margin-top: 15px;">Thank you for your understanding!</p>
            <p>Shroomtopia Team</p>
          </div>
        </div>
      `
    }

    const response = await sgMail.send(msg)
    console.log('Reward rejected email sent to', email, 'Response:', response[0].statusCode)
    return { success: true, message: 'Reward rejection email sent successfully' }
  } catch (error) {
    console.error('Error sending reward rejected email to', email, 'Error:', error.message)
    return { 
      success: false, 
      message: 'Failed to send reward rejection email',
      error: error.message 
    }
  }
}

module.exports = {
  sendWelcomeEmail,
  sendAccountSuspendedEmail,
  sendAccountVerifiedEmail,
  sendRewardApprovedEmail,
  sendRewardRejectedEmail
}

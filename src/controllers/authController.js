const UserRegistration = require('../models/User')
const LoginEvent = require('../models/LoginEvent')
const jwt = require('jsonwebtoken')
const { sendWelcomeEmail } = require('../utils/emailService')
const { sendOTP } = require('../utils/smsService')

module.exports = {


  Adminlogin: async (req, res) => {
    try {
      const { phone, email, password, isAdmin } = req.body

      // For phone-based login (user role)
      if (phone && !email && !password) {
        const user = await UserRegistration.findOne({ phone })

        if (!user) {
          return res
            .status(401)
            .json({ message: 'User not found with this phone number' })
        }

        // Check if user has admin role when isAdmin flag is true
        if (isAdmin && user.role !== 'admin') {
          return res
            .status(403)
            .json({ message: 'Access denied. Admin privileges required.' })
        }

        // Check if user account is suspended
        if (user.status === 'suspend') {
          return res.status(403).json({
            success: false,
            message: 'Your account has been suspended. Please contact support.',
          })
        }

        const otp = '0000'

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id, phone: user.phone, role: user.role },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1d' },
        )

        res.json({
          success: true,
          message: 'OTP sent successfully',
          token,
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
            status: user.status,
          },
        })
      }
      // For email-based login (admin role)
      else if (email && password) {
        const user = await UserRegistration.findOne({ email })

        if (!user) {
          return res
            .status(401)
            .json({ message: 'User not found with this email' })
        }

        // For admin panel, check if user has admin role
        if (user.role !== 'admin') {
          return res
            .status(403)
            .json({ message: 'Access denied. Admin privileges required.' })
        }

        // In a real implementation, we would verify the password hash
        // For now, we'll just use a hardcoded check for demo purposes
        // TODO: Implement proper password hashing and verification
        if (password !== 'admin123') {
          return res.status(401).json({ message: 'Invalid password' })
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1d' },
        )

        // record login event for admin email login
        try {
          await LoginEvent.create({ user: user._id })
        } catch (e) {
          console.error('LoginEvent error:', e?.message)
        }

        res.json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
          },
        })
      } else {
        return res.status(400).json({ message: 'Phone number is required' })
      }
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  AdminverifyOtp: async (req, res) => {
    try {
      const { otp, phone } = req.body

      if (!otp || !phone) {
        return res
          .status(400)
          .json({ message: 'OTP and phone number are required' })
      }

      // Find user by phone number
      const user = await UserRegistration.findOne({ phone })

      if (!user) {
        return res
          .status(401)
          .json({ message: 'User not found with this phone number' })
      }

      // Check if user account is suspended
      if (user.status === 'suspend') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Please contact support.',
        })
      }

      // In a real implementation, we would verify the OTP from database
      // For now, we'll just check if it's our hardcoded value: 0000
      if (otp !== '0000') {
        return res.status(401).json({ message: 'Invalid OTP' })
      }

      // Generate a new token after successful OTP verification (include role)
      const token = jwt.sign(
        { id: user._id, phone: user.phone, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' },
      )

      // record login event
      try {
        await LoginEvent.create({ user: user._id })
      } catch (e) {
        console.error('LoginEvent error:', e?.message)
      }

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
        },
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Server error' })
    }
  },
  getProfile: async (req, res) => {
    try {
      const userId = req.user.id

      // Find user by ID
      const user = await UserRegistration.findById(userId)

      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      // Return user profile data
      res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          birthday: user.birthday,
          howDidYouHear: user.howDidYouHear,
          governmentId: user.governmentId,
          createdAt: user.createdAt,
        },
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  verifyOtp: async (req, res) => {
    try {
      const { otp, phone } = req.body
      console.log('OTP Verification Request:', { phone, receivedOTP: otp });

      if (!otp || !phone) {
        return res
          .status(400)
          .json({ message: 'OTP and phone number are required' })
      }

      // Find user by phone number, explicitly including OTP fields
      const user = await UserRegistration.findOne({ phone }).select('+otp +otpExpires');
      console.log('User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('Stored OTP:', user.otp);
        console.log('OTP Expires:', user.otpExpires);
        console.log('Current Time:', new Date());
        console.log('User document before verification:', JSON.stringify(user, null, 2));
      }

      if (!user) {
        return res
          .status(401)
          .json({ message: 'User not found with this phone number' })
      }

      // Check if user account is suspended
      if (user.status === 'suspend') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Please contact support.',
        })
      }

      // Check if OTP is valid and not expired
      const receivedOTP = otp.toString().trim();
      const storedOTP = user.otp ? user.otp.toString().trim() : null;
      
      console.log('OTP Comparison - Received:', receivedOTP, 'Stored:', storedOTP);
      
      if (receivedOTP !== storedOTP) {
        console.log('OTP Mismatch - Received:', receivedOTP, 'Expected:', storedOTP);
        return res.status(401).json({ 
          success: false,
          message: 'Invalid OTP. Please check and try again.' 
        })
      }
      
      if (new Date() > user.otpExpires) {
        return res.status(401).json({ message: 'OTP has expired. Please request a new one.' })
      }
      
      // Clear used OTP
      user.otp = undefined
      user.otpExpires = undefined
      await user.save()

      // Generate a new token after successful OTP verification (include role)
      const token = jwt.sign(
        { id: user._id, phone: user.phone, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' },
      )

      // record login event
      try {
        await LoginEvent.create({ user: user._id })
      } catch (e) {
        console.error('LoginEvent error:', e?.message)
      }

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
        },
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  register: async (req, res) => {
    try {
      const { email, fullName, phone, day, month, year, howDidYouHear, takesMedication, medicationDetails } =
        req.body

      if (!fullName || !phone || !day || !month || !year || !howDidYouHear) {
        return res
          .status(400)
          .json({ message: 'All required fields must be filled' })
      }

      const existing = await UserRegistration.findOne({ email })
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' })
      }

      let governmentId = ''
      if (req.file) {
        console.log('Government ID file:', JSON.stringify(req.file, null, 2))

        // Debug S3 upload
        if (process.env.AWS_ACCESS_KEY) {
          console.log('AWS S3 is configured. File should be uploaded to S3.')
          if (req.file.location) {
            governmentId = req.file.location
            console.log('S3 file location:', req.file.location)
          } else {
            console.error(
              'Error: S3 is configured but req.file.location is undefined',
            )
          
            if (req.file.key) {
              governmentId = `${process.env.ASSET_ROOT}/${req.file.key}`
              console.log('Constructed S3 URL from key:', governmentId)
            }
          }
        } else {
          console.log('AWS S3 is not configured. Using local storage.')
          governmentId = req.file.filename
            ? `/uploads/${req.file.filename}`
            : ''
        }

        console.log('Saved government ID URL:', governmentId)
      }

      // Convert takesMedication to boolean
      const takesMedicationBool = takesMedication === 'true' || takesMedication === true;
      
      const newUser = new UserRegistration({
        email,
        fullName,
        phone,
        birthday: { day, month, year },
        howDidYouHear,
        governmentId,
        takesMedication: takesMedicationBool,
        medicationDetails: takesMedicationBool ? (medicationDetails || '') : '',
      })

      await newUser.save()

      // Send welcome email in background (don't await to prevent blocking)
      sendWelcomeEmail(email, fullName.split(' ')[0])
        .then(result => {
          if (!result.success) {
            console.error('Background email error:', result.error)
            console.error('Email sending failed for:', email)
          }
        })

      res.status(201).json({
        message: 'Registration successful',
        user: newUser,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Server error' })
    }
  },
  login: async (req, res) => {
    try {
      const { phone, email, password, isAdmin } = req.body

      // For phone-based login (user role)
      if (phone && !email && !password) {
        const user = await UserRegistration.findOne({ phone })

        if (!user) {
          return res
            .status(401)
            .json({ message: 'User not found with this phone number' })
        }

        // Check if user has admin role when isAdmin flag is true
        if (isAdmin && user.role !== 'admin') {
          return res
            .status(403)
            .json({ message: 'Access denied. Admin privileges required.' })
        }

        // Check if user account is suspended
        if (user.status === 'suspend') {
          return res.status(403).json({
            success: false,
            message: 'Your account has been suspended. Please contact support.',
          })
        }

        // Send OTP via Twilio
        const { success, otp, error } = await sendOTP(phone)
        
        if (!success) {
          console.error('Failed to send OTP:', error)
          return res.status(500).json({ message: 'Failed to send OTP. Please try again.' })
        }
        
        // Store OTP in user document as a string
        const otpString = otp.toString().trim();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Use findOneAndUpdate to ensure the update is applied
        const updatedUser = await UserRegistration.findOneAndUpdate(
          { _id: user._id },
          { 
            $set: { 
              otp: otpString,
              otpExpires: otpExpiry 
            } 
          },
          { new: true, select: '+otp +otpExpires' }
        );
        
        console.log('Stored OTP:', updatedUser.otp, 'Expires at:', updatedUser.otpExpires);
        console.log('Updated user document:', JSON.stringify(updatedUser, null, 2));

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id, phone: user.phone, role: user.role },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1d' },
        )

        res.json({
          success: true,
          message: 'OTP sent successfully',
          token,
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
            status: user.status,
          },
        })
      }
      // For email-based login (admin role)
      else if (email && password) {
        const user = await UserRegistration.findOne({ email })

        if (!user) {
          return res
            .status(401)
            .json({ message: 'User not found with this email' })
        }

        // For admin panel, check if user has admin role
        if (user.role !== 'admin') {
          return res
            .status(403)
            .json({ message: 'Access denied. Admin privileges required.' })
        }

        // In a real implementation, we would verify the password hash
        // For now, we'll just use a hardcoded check for demo purposes
        // TODO: Implement proper password hashing and verification
        if (password !== 'admin123') {
          return res.status(401).json({ message: 'Invalid password' })
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1d' },
        )

        // record login event for admin email login
        try {
          await LoginEvent.create({ user: user._id })
        } catch (e) {
          console.error('LoginEvent error:', e?.message)
        }

        res.json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
          },
        })
      } else {
        return res.status(400).json({ message: 'Phone number is required' })
      }
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { id } = req.params
      const { fullName, phone, day, month, year, howDidYouHear } = req.body

      let governmentIdUpdate = {}
      let avatarUpdate = {}

      // Handle file uploads with multiple fields
      if (req.files) {
        console.log('Files uploaded:', Object.keys(req.files))

        // Handle government ID upload
        if (req.files.govId && req.files.govId.length > 0) {
          const govIdFile = req.files.govId[0]
          console.log(
            'Updated government ID file:',
            JSON.stringify(govIdFile, null, 2),
          )

          let governmentId = ''

          if (process.env.AWS_ACCESS_KEY) {
            console.log('AWS S3 is configured. File should be uploaded to S3.')
            if (govIdFile.location) {
              governmentId = govIdFile.location
              console.log('S3 file location:', govIdFile.location)
            } else {
              console.error(
                'Error: S3 is configured but govIdFile.location is undefined',
              )
              // Fallback to asset root + key if location is missing
              if (govIdFile.key) {
                governmentId = `${process.env.ASSET_ROOT}/${govIdFile.key}`
                console.log('Constructed S3 URL from key:', governmentId)
              }
            }
          } else {
            console.log('AWS S3 is not configured. Using local storage.')
            governmentId = govIdFile.filename
              ? `/uploads/${govIdFile.filename}`
              : ''
          }

          console.log('Updated government ID URL:', governmentId)
          governmentIdUpdate = { governmentId }
        }

        // Handle avatar upload
        if (req.files.avatar && req.files.avatar.length > 0) {
          const avatarFile = req.files.avatar[0]
          console.log(
            'Updated avatar file:',
            JSON.stringify(avatarFile, null, 2),
          )

          let avatar = ''

          if (process.env.AWS_ACCESS_KEY) {
            console.log('AWS S3 is configured. File should be uploaded to S3.')
            if (avatarFile.location) {
              avatar = avatarFile.location
              console.log('S3 file location:', avatarFile.location)
            } else {
              console.error(
                'Error: S3 is configured but avatarFile.location is undefined',
              )
              // Fallback to asset root + key if location is missing
              if (avatarFile.key) {
                avatar = `${process.env.ASSET_ROOT}/${avatarFile.key}`
                console.log('Constructed S3 URL from key:', avatar)
              }
            }
          } else {
            console.log('AWS S3 is not configured. Using local storage.')
            avatar = avatarFile.filename
              ? `/uploads/${avatarFile.filename}`
              : ''
          }

          console.log('Updated avatar URL:', avatar)
          avatarUpdate = { avatar }
        }
      }

      // For backward compatibility with single file upload
      if (req.file) {
        console.log('Single file uploaded:', req.file.fieldname)

        if (req.file.fieldname === 'govId') {
          console.log(
            'Updated government ID file:',
            JSON.stringify(req.file, null, 2),
          )

          let governmentId = ''

          if (process.env.AWS_ACCESS_KEY) {
            console.log('AWS S3 is configured. File should be uploaded to S3.')
            if (req.file.location) {
              governmentId = req.file.location
              console.log('S3 file location:', req.file.location)
            } else {
              console.error(
                'Error: S3 is configured but req.file.location is undefined',
              )
              // Fallback to asset root + key if location is missing
              if (req.file.key) {
                governmentId = `${process.env.ASSET_ROOT}/${req.file.key}`
                console.log('Constructed S3 URL from key:', governmentId)
              }
            }
          } else {
            console.log('AWS S3 is not configured. Using local storage.')
            governmentId = req.file.filename
              ? `/uploads/${req.file.filename}`
              : ''
          }

          console.log('Updated government ID URL:', governmentId)
          governmentIdUpdate = { governmentId }
        } else if (req.file.fieldname === 'avatar') {
          console.log('Updated avatar file:', JSON.stringify(req.file, null, 2))

          let avatar = ''

          if (process.env.AWS_ACCESS_KEY) {
            console.log('AWS S3 is configured. File should be uploaded to S3.')
            if (req.file.location) {
              avatar = req.file.location
              console.log('S3 file location:', req.file.location)
            } else {
              console.error(
                'Error: S3 is configured but req.file.location is undefined',
              )
              // Fallback to asset root + key if location is missing
              if (req.file.key) {
                avatar = `${process.env.ASSET_ROOT}/${req.file.key}`
                console.log('Constructed S3 URL from key:', avatar)
              }
            }
          } else {
            console.log('AWS S3 is not configured. Using local storage.')
            avatar = req.file.filename ? `/uploads/${req.file.filename}` : ''
          }

          console.log('Updated avatar URL:', avatar)
          avatarUpdate = { avatar }
        }
      }

      const updateFields = {}
      if (fullName) updateFields.fullName = fullName
      if (phone) updateFields.phone = phone
      if (howDidYouHear) updateFields.howDidYouHear = howDidYouHear

      if (day || month || year) {
        updateFields.birthday = {
          ...(day && { day }),
          ...(month && { month }),
          ...(year && { year }),
        }
      }

      if (Object.keys(governmentIdUpdate).length > 0) {
        updateFields.governmentId = governmentIdUpdate.governmentId
      }

      if (Object.keys(avatarUpdate).length > 0) {
        updateFields.avatar = avatarUpdate.avatar
      }

      const updatedUser = await UserRegistration.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true },
      )

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' })
      }

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Server error' })
    }
  },
}

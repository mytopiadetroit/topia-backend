const UserRegistration = require('../models/User');
const jwt = require('jsonwebtoken');

module.exports = {
  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Find user by ID
      const user = await UserRegistration.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
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
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
  
  verifyOtp: async (req, res) => {
    try {
      const { otp, phone } = req.body;

      if (!otp || !phone) {
        return res.status(400).json({ message: "OTP and phone number are required" });
      }

      // Find user by phone number
      const user = await UserRegistration.findOne({ phone });

      if (!user) {
        return res.status(401).json({ message: "User not found with this phone number" });
      }

      // In a real implementation, we would verify the OTP from database
      // For now, we'll just check if it's our hardcoded value: 0000
      if (otp !== "0000") {
        return res.status(401).json({ message: "Invalid OTP" });
      }

      // Generate a new token after successful OTP verification
      const token = jwt.sign(
        { id: user._id, phone: user.phone },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: "7d" } // Longer expiry for verified login
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  register: async (req, res) => {
    try {
      const {
        email,
        fullName,
        phone,
        day,
        month,
        year,
        howDidYouHear,
      } = req.body;

     
      if (  !fullName || !phone || !day || !month || !year || !howDidYouHear) {
        return res.status(400).json({ message: 'All required fields must be filled' });
      }

   
      const existing = await UserRegistration.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      let governmentId = '';
      if (req.file) {
        console.log('Government ID file:', JSON.stringify(req.file, null, 2));
        
        // Debug S3 upload
        if (process.env.AWS_ACCESS_KEY) {
          console.log('AWS S3 is configured. File should be uploaded to S3.');
          if (req.file.location) {
            governmentId = req.file.location;
            console.log('S3 file location:', req.file.location);
          } else {
            console.error('Error: S3 is configured but req.file.location is undefined');
            // Fallback to asset root + key if location is missing
            if (req.file.key) {
              governmentId = `${process.env.ASSET_ROOT}/${req.file.key}`;
              console.log('Constructed S3 URL from key:', governmentId);
            }
          }
        } else {
          console.log('AWS S3 is not configured. Using local storage.');
          governmentId = req.file.filename ? `/uploads/${req.file.filename}` : '';
        }
        
        console.log('Saved government ID URL:', governmentId);
      }

      const newUser = new UserRegistration({
        email,
        fullName,
        phone,
        birthday: { day, month, year },
        howDidYouHear,
        governmentId
      });

      await newUser.save();

      res.status(201).json({
        message: 'Registration successful',
        user: newUser
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  login: async (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

     
      const user = await UserRegistration.findOne({ phone });

      if (!user) {
        return res.status(401).json({ message: "User not found with this phone number" });
      }

      const otp = "0000";
     

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, phone: user.phone },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: "1d" }
      );

      res.json({
        success: true,
        message: 'OTP sent successfully',
        token, 
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },


  updateProfile: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        fullName,
        phone,
        day,
        month,
        year,
        howDidYouHear,
      } = req.body;
      
     
      let governmentIdUpdate = {};
      if (req.file) {
        console.log('Updated government ID file:', JSON.stringify(req.file, null, 2));
        
        let governmentId = '';
      
        if (process.env.AWS_ACCESS_KEY) {
          console.log('AWS S3 is configured. File should be uploaded to S3.');
          if (req.file.location) {
            governmentId = req.file.location;
            console.log('S3 file location:', req.file.location);
          } else {
            console.error('Error: S3 is configured but req.file.location is undefined');
            // Fallback to asset root + key if location is missing
            if (req.file.key) {
              governmentId = `${process.env.ASSET_ROOT}/${req.file.key}`;
              console.log('Constructed S3 URL from key:', governmentId);
            }
          }
        } else {
          console.log('AWS S3 is not configured. Using local storage.');
          governmentId = req.file.filename ? `/uploads/${req.file.filename}` : '';
        }
        
        console.log('Updated government ID URL:', governmentId);
        governmentIdUpdate = { governmentId };
      }

     
      const updateFields = {};
      if (fullName) updateFields.fullName = fullName;
      if (phone) updateFields.phone = phone;
      if (howDidYouHear) updateFields.howDidYouHear = howDidYouHear;

      if (day || month || year) {
        updateFields.birthday = {
          ...(day && { day }),
          ...(month && { month }),
          ...(year && { year })
        };
      }

      
      if (Object.keys(governmentIdUpdate).length > 0) {
        updateFields.governmentId = governmentIdUpdate.governmentId;
      }

      const updatedUser = await UserRegistration.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

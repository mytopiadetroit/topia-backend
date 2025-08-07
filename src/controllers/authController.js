const User = require('../models/User');

exports.registerUser = async (req, res) => {
  try {
    const { email, fullName, phone, day, month, year, howDidYouHear, agreeToTerms } = req.body;
    if (!email || !fullName || !phone || !day || !month || !year || agreeToTerms !== true) {
      return res.status(400).json({ error: 'All required fields must be filled and terms agreed.' });
    }
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'User already exists with this email.' });
    }
    const user = new User({
      email,
      fullName,
      phone,
      birthday: { day, month, year },
      howDidYouHear,
      agreeToTerms,
    });
    await user.save();
    res.status(201).json({ message: 'User registered successfully', user: { email, fullName, phone, birthday: { day, month, year }, howDidYouHear } });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

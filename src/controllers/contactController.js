const ContactMessage = require('@models/ContactMessage');

module.exports = {
  create: async (req, res) => {
    try {
      const { fullName, email, mobileNumber, message } = req.body;
      if (!fullName || !email || !mobileNumber || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }
      const doc = await ContactMessage.create({ fullName, email, mobileNumber, message });
      return res.status(201).json({ success: true, data: doc, message: 'Message submitted successfully' });
    } catch (error) {
      console.error('Contact create error:', error);
      if (error && error.code === 11000) {
        // Duplicate key error
        const fields = Object.keys(error.keyPattern || {});
        const field = fields[0] || 'field';
        return res.status(409).json({ success: false, message: `${field} already exists` });
      }
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const query = search
        ? {
            $or: [
              { fullName: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { mobileNumber: { $regex: search, $options: 'i' } },
              { message: { $regex: search, $options: 'i' } }
            ]
          }
        : {};

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await Promise.all([
        ContactMessage.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        ContactMessage.countDocuments(query)
      ]);

      return res.json({ success: true, data: items, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
      console.error('Contact getAll error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  markRead: async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await ContactMessage.findByIdAndUpdate(id, { isRead: true }, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Message not found' });
      }
      return res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Contact markRead error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await ContactMessage.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Message not found' });
      }
      return res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      console.error('Contact delete error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};



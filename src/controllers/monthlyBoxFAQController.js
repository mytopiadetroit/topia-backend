const MonthlyBoxFAQ = require('../models/MonthlyBoxFAQ');

const getAllFAQs = async (req, res) => {
  try {
    const faqs = await MonthlyBoxFAQ.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addFAQ = async (req, res) => {
  try {
    const { question, answer, order } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ success: false, message: 'Question and answer required' });
    }

    const faq = new MonthlyBoxFAQ({ question, answer, order: order || 0 });
    await faq.save();
    
    res.json({ success: true, data: faq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, order, isActive } = req.body;
    
    const faq = await MonthlyBoxFAQ.findByIdAndUpdate(
      id,
      { question, answer, order, isActive },
      { new: true, runValidators: true }
    );
    
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }
    
    res.json({ success: true, data: faq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await MonthlyBoxFAQ.findByIdAndDelete(id);
    
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }
    
    res.json({ success: true, message: 'FAQ deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllFAQs, addFAQ, updateFAQ, deleteFAQ };

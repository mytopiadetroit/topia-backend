const AboutUs = require('../models/AboutUs');


const getAboutUs = async (req, res) => {
  try {
    let aboutUs = await AboutUs.findOne().populate('lastUpdatedBy', 'name email');
    
  
    if (!aboutUs) {
      aboutUs = new AboutUs({
        content: '<h1>About Us</h1><p>Welcome to our store!</p>',
        ourApproach: '',
        faqs: [],
        contactInfo: {
          address: '',
          workingHours: '',
          phone: ''
        }
      });
      await aboutUs.save();
    }

    res.json({
      success: true,
      data: aboutUs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching About Us data',
      error: error.message
    });
  }
};


const updateAboutUsContent = async (req, res) => {
  try {
    const { content, ourApproach } = req.body;

    if (!content && !ourApproach) {
      return res.status(400).json({
        success: false,
        message: 'Content or Our Approach is required'
      });
    }

    let aboutUs = await AboutUs.findOne();
    
    if (!aboutUs) {
      aboutUs = new AboutUs({
        content: content || '<h1>About Us</h1>',
        ourApproach: ourApproach || '',
        lastUpdatedBy: req.user.id
      });
    } else {
      if (content !== undefined) aboutUs.content = content;
      if (ourApproach !== undefined) aboutUs.ourApproach = ourApproach;
      aboutUs.lastUpdatedBy = req.user.id;
    }

    await aboutUs.save();
    await aboutUs.populate('lastUpdatedBy', 'name email');

    res.json({
      success: true,
      message: 'About Us content updated successfully',
      data: aboutUs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating About Us content',
      error: error.message
    });
  }
};


const updateContactInfo = async (req, res) => {
  try {
    const { address, workingHours, phone } = req.body;

    let aboutUs = await AboutUs.findOne();
    
    if (!aboutUs) {
      aboutUs = new AboutUs({
        content: '<h1>About Us</h1>',
        contactInfo: { address, workingHours, phone },
        lastUpdatedBy: req.user.id
      });
    } else {
      aboutUs.contactInfo = {
        address: address || aboutUs.contactInfo.address,
        workingHours: workingHours || aboutUs.contactInfo.workingHours,
        phone: phone || aboutUs.contactInfo.phone
      };
      aboutUs.lastUpdatedBy = req.user.id;
    }

    await aboutUs.save();
    await aboutUs.populate('lastUpdatedBy', 'name email');

    res.json({
      success: true,
      message: 'Contact info updated successfully',
      data: aboutUs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating contact info',
      error: error.message
    });
  }
};


const addFAQ = async (req, res) => {
  try {
    const { question, answer, order } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Question and answer are required'
      });
    }

    let aboutUs = await AboutUs.findOne();
    
    if (!aboutUs) {
      aboutUs = new AboutUs({
        content: '<h1>About Us</h1>',
        faqs: [{ question, answer, order: order || 0 }],
        lastUpdatedBy: req.user.id
      });
    } else {
      aboutUs.faqs.push({
        question,
        answer,
        order: order || aboutUs.faqs.length
      });
      aboutUs.lastUpdatedBy = req.user.id;
    }

    await aboutUs.save();
    await aboutUs.populate('lastUpdatedBy', 'name email');

    res.json({
      success: true,
      message: 'FAQ added successfully',
      data: aboutUs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding FAQ',
      error: error.message
    });
  }
};


const updateFAQ = async (req, res) => {
  try {
    const { faqId } = req.params;
    const { question, answer, order, isActive } = req.body;

    const aboutUs = await AboutUs.findOne();
    
    if (!aboutUs) {
      return res.status(404).json({
        success: false,
        message: 'About Us data not found'
      });
    }

    const faq = aboutUs.faqs.id(faqId);
    
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    if (question !== undefined) faq.question = question;
    if (answer !== undefined) faq.answer = answer;
    if (order !== undefined) faq.order = order;
    if (isActive !== undefined) faq.isActive = isActive;

    aboutUs.lastUpdatedBy = req.user.id;
    await aboutUs.save();
    await aboutUs.populate('lastUpdatedBy', 'name email');

    res.json({
      success: true,
      message: 'FAQ updated successfully',
      data: aboutUs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating FAQ',
      error: error.message
    });
  }
};


const deleteFAQ = async (req, res) => {
  try {
    const { faqId } = req.params;

    const aboutUs = await AboutUs.findOne();
    
    if (!aboutUs) {
      return res.status(404).json({
        success: false,
        message: 'About Us data not found'
      });
    }

    aboutUs.faqs.pull(faqId);
    aboutUs.lastUpdatedBy = req.user.id;
    
    await aboutUs.save();
    await aboutUs.populate('lastUpdatedBy', 'name email');

    res.json({
      success: true,
      message: 'FAQ deleted successfully',
      data: aboutUs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting FAQ',
      error: error.message
    });
  }
};


const reorderFAQs = async (req, res) => {
  try {
    const { faqOrders } = req.body;

    if (!Array.isArray(faqOrders)) {
      return res.status(400).json({
        success: false,
        message: 'faqOrders must be an array'
      });
    }

    const aboutUs = await AboutUs.findOne();
    
    if (!aboutUs) {
      return res.status(404).json({
        success: false,
        message: 'About Us data not found'
      });
    }

    faqOrders.forEach(({ faqId, order }) => {
      const faq = aboutUs.faqs.id(faqId);
      if (faq) {
        faq.order = order;
      }
    });

    aboutUs.lastUpdatedBy = req.user.id;
    await aboutUs.save();
    await aboutUs.populate('lastUpdatedBy', 'name email');

    res.json({
      success: true,
      message: 'FAQs reordered successfully',
      data: aboutUs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reordering FAQs',
      error: error.message
    });
  }
};

module.exports = {
  getAboutUs,
  updateAboutUsContent,
  updateContactInfo,
  addFAQ,
  updateFAQ,
  deleteFAQ,
  reorderFAQs
};

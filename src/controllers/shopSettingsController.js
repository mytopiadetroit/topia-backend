'use strict';
const ShopSettings = require('../models/ShopSettings');


exports.getShopSettings = async (req, res) => {
  try {
    let settings = await ShopSettings.findOne({});

    
    if (!settings) {
      settings = await ShopSettings.create({
        phone: '+1234567890',
        timings: [
          { day: 'monday', isOpen: true, openingTime: '09:00', closingTime: '18:00' },
          { day: 'tuesday', isOpen: true, openingTime: '09:00', closingTime: '18:00' },
          { day: 'wednesday', isOpen: true, openingTime: '09:00', closingTime: '18:00' },
          { day: 'thursday', isOpen: true, openingTime: '09:00', closingTime: '18:00' },
          { day: 'friday', isOpen: true, openingTime: '09:00', closingTime: '18:00' },
          { day: 'saturday', isOpen: true, openingTime: '10:00', closingTime: '15:00' },
          { day: 'sunday', isOpen: false }
        ]
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Shop settings fetched successfully',
      data: settings
    });
  } catch (error) {
    console.error('getShopSettings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching shop settings'
    });
  }
};


exports.updateShopSettings = async (req, res) => {
  try {
    const { phone, timings } = req.body || {};

    const validDays = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ];

    // Validate timings array
    if (timings && Array.isArray(timings)) {
      if (timings.length !== 7) {
        return res.status(400).json({
          success: false,
          message: 'Timings must include all 7 days of the week'
        });
      }

      const daysInTimings = timings.map(t => t.day.toLowerCase());
      const hasAllDays = validDays.every(day => daysInTimings.includes(day));

      if (!hasAllDays) {
        return res.status(400).json({
          success: false,
          message: 'Timings must include all days: Monday to Sunday'
        });
      }
    }

    let settings = await ShopSettings.findOne({});

    if (!settings) {
      settings = new ShopSettings({ phone, timings });
    } else {
      settings.phone = phone || settings.phone;
      if (timings) settings.timings = timings;
    }

    const updated = await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Shop settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('updateShopSettings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating shop settings'
    });
  }
};

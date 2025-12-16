'use strict';
const Tax = require('../models/Tax');

// Get tax settings
exports.getTaxSettings = async (req, res) => {
  try {
    let tax = await Tax.findOne({ isActive: true });

    if (!tax) {
      tax = await Tax.create({
        name: 'Sales Tax',
        percentage: 7,
        isActive: true,
        description: 'Default sales tax'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Tax settings fetched successfully',
      data: tax
    });
  } catch (error) {
    console.error('getTaxSettings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching tax settings'
    });
  }
};

// Update tax settings
exports.updateTaxSettings = async (req, res) => {
  try {
    const { name, percentage, isActive, description } = req.body || {};

    // Validate percentage
    if (percentage !== undefined) {
      if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Tax percentage must be a number between 0 and 100'
        });
      }
    }

    let tax = await Tax.findOne({ isActive: true });

    if (!tax) {
      tax = new Tax({
        name: name || 'Sales Tax',
        percentage: percentage !== undefined ? percentage : 7,
        isActive: isActive !== undefined ? isActive : true,
        description: description || ''
      });
    } else {
      if (name !== undefined) tax.name = name;
      if (percentage !== undefined) tax.percentage = percentage;
      if (isActive !== undefined) tax.isActive = isActive;
      if (description !== undefined) tax.description = description;
    }

    const updated = await tax.save();

    return res.status(200).json({
      success: true,
      message: 'Tax settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('updateTaxSettings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating tax settings'
    });
  }
};

'use strict';
const HomepageSettings = require('../models/HomepageSettings');

exports.getHomepageSettings = async (req, res) => {
  try {
    let settings = await HomepageSettings.findOne({});

    if (!settings) {
      settings = await HomepageSettings.create({
        rewardsSectionVisible: true,
        feedbackSectionVisible: true
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Homepage settings fetched successfully',
      data: settings
    });
  } catch (error) {
    console.error('getHomepageSettings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching homepage settings'
    });
  }
};

exports.updateHomepageSettings = async (req, res) => {
  try {
    const { rewardsSectionVisible, feedbackSectionVisible } = req.body || {};

    let settings = await HomepageSettings.findOne({});

    if (!settings) {
      settings = new HomepageSettings({
        rewardsSectionVisible: rewardsSectionVisible !== undefined ? rewardsSectionVisible : true,
        feedbackSectionVisible: feedbackSectionVisible !== undefined ? feedbackSectionVisible : true
      });
    } else {
      if (rewardsSectionVisible !== undefined) settings.rewardsSectionVisible = rewardsSectionVisible;
      if (feedbackSectionVisible !== undefined) settings.feedbackSectionVisible = feedbackSectionVisible;
    }

    const updated = await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Homepage settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('updateHomepageSettings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating homepage settings'
    });
  }
};

exports.toggleRewardsSection = async (req, res) => {
  try {
    let settings = await HomepageSettings.findOne({});

    if (!settings) {
      settings = await HomepageSettings.create({
        rewardsSectionVisible: false,
        feedbackSectionVisible: true
      });
    } else {
      settings.rewardsSectionVisible = !settings.rewardsSectionVisible;
    }

    const updated = await settings.save();

    return res.status(200).json({
      success: true,
      message: `Rewards section ${settings.rewardsSectionVisible ? 'shown' : 'hidden'} successfully`,
      data: updated
    });
  } catch (error) {
    console.error('toggleRewardsSection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while toggling rewards section'
    });
  }
};

exports.toggleFeedbackSection = async (req, res) => {
  try {
    let settings = await HomepageSettings.findOne({});

    if (!settings) {
      settings = await HomepageSettings.create({
        rewardsSectionVisible: true,
        feedbackSectionVisible: false
      });
    } else {
      settings.feedbackSectionVisible = !settings.feedbackSectionVisible;
    }

    const updated = await settings.save();

    return res.status(200).json({
      success: true,
      message: `Feedback section ${settings.feedbackSectionVisible ? 'shown' : 'hidden'} successfully`,
      data: updated
    });
  } catch (error) {
    console.error('toggleFeedbackSection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while toggling feedback section'
    });
  }
};

const ReviewTag = require('../models/ReviewTag')

exports.createReviewTag = async (req, res) => {
  try {
    const { label, isActive = true } = req.body || {}
    if (!label)
      return res
        .status(400)
        .json({ success: false, message: 'Label is required' })
    const tag = await ReviewTag.create({ label, isActive })
    return res.status(201).json({ success: true, data: tag })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

exports.getReviewTags = async (req, res) => {
  try {
    const { active } = req.query
    const filter = {}
    if (typeof active !== 'undefined')
      filter.isActive = active === 'true' || active === true
    const tags = await ReviewTag.find(filter).sort({ createdAt: -1 })
    return res.status(200).json({ success: true, data: tags })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

exports.getReviewTagById = async (req, res) => {
  try {
    const tag = await ReviewTag.findById(req.params.id)
    if (!tag)
      return res.status(404).json({ success: false, message: 'Tag not found' })
    return res.status(200).json({ success: true, data: tag })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

exports.updateReviewTag = async (req, res) => {
  try {
    const { label, isActive } = req.body || {}
    const tag = await ReviewTag.findByIdAndUpdate(
      req.params.id,
      { label, isActive },
      { new: true, runValidators: true },
    )
    if (!tag)
      return res.status(404).json({ success: false, message: 'Tag not found' })
    return res.status(200).json({ success: true, data: tag })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

exports.deleteReviewTag = async (req, res) => {
  try {
    const tag = await ReviewTag.findByIdAndDelete(req.params.id)
    if (!tag)
      return res.status(404).json({ success: false, message: 'Tag not found' })
    return res
      .status(200)
      .json({ success: true, message: 'Tag deleted successfully' })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

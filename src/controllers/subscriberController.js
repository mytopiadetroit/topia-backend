'use strict'
const Subscriber = require('../models/Subscriber')

// POST /api/subscribers
exports.createSubscriber = async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: 'Email is required' })
    }

    const existing = await Subscriber.findOne({
      email: email.toLowerCase().trim(),
    })
    if (existing) {
      return res
        .status(200)
        .json({ success: true, message: 'Already subscribed', data: existing })
    }

    const subscriber = await Subscriber.create({ email })
    return res.status(201).json({
      success: true,
      message: 'Subscribed successfully',
      data: subscriber,
    })
  } catch (error) {
    console.error('createSubscriber error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/subscribers
exports.getSubscribers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1)
    const search = (req.query.search || '').toString().trim().toLowerCase()

    const filter = search ? { email: { $regex: search, $options: 'i' } } : {}

    const [items, total] = await Promise.all([
      Subscriber.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Subscriber.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    })
  } catch (error) {
    console.error('getSubscribers error:', error)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

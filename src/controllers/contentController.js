const Content = require('../models/Content.js')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Get all content with pagination and filters
const getAllContent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const filter = {}

    // Add filters
    if (req.query.type) filter.type = req.query.type
    if (req.query.status) filter.status = req.query.status
    if (req.query.category)
      filter.category = new RegExp(req.query.category, 'i')
    if (req.query.search) {
      filter.$or = [
        { title: new RegExp(req.query.search, 'i') },
        { description: new RegExp(req.query.search, 'i') },
        { content: new RegExp(req.query.search, 'i') },
      ]
    }

    const content = await Content.find(filter)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Content.countDocuments(filter)

    res.json({
      success: true,
      data: content,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching content',
      error: error.message,
    })
  }
}

// Get published content for public view
const getPublishedContent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const filter = { status: 'published' }

    if (req.query.type) filter.type = req.query.type
    if (req.query.category)
      filter.category = new RegExp(req.query.category, 'i')
    if (req.query.search) {
      filter.$or = [
        { title: new RegExp(req.query.search, 'i') },
        { description: new RegExp(req.query.search, 'i') },
      ]
    }

    const content = await Content.find(filter)
      .populate('author', 'name')
      .select('-content') // Don't send full content in list view
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Content.countDocuments(filter)

    res.json({
      success: true,
      data: content,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching published content',
      error: error.message,
    })
  }
}

// Get single content by ID
const getContentById = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id).populate(
      'author',
      'name email',
    )

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      })
    }

    // NOTE: Views are no longer incremented on GET. Use POST /public/:id/view instead.

    res.json({
      success: true,
      data: content,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching content',
      error: error.message,
    })
  }
}

const createContent = async (req, res) => {
  try {
    const contentData = {
      ...req.body,
      author: req.user?.id || null, // handle case if no auth
    }

    // Handle file uploads (S3 ka .location prefer hoga, warna local fallback)
    if (req.files.featuredImage) {
      contentData.featuredImage =
        req.files.featuredImage[0].location ||
        `/uploads/content/${req.files.featuredImage[0].filename}`
    }

    if (req.files.featuredVideo) {
      contentData.videoUrl =
        req.files.featuredVideo[0].location ||
        `/uploads/content/${req.files.featuredVideo[0].filename}`
    }

    if (req.files.videoThumbnail) {
      contentData.videoThumbnail =
        req.files.videoThumbnail[0].location ||
        `/uploads/content/${req.files.videoThumbnail[0].filename}`
    }

    // Parse tags if they're sent as string
    if (typeof contentData.tags === 'string') {
      contentData.tags = contentData.tags.split(',').map((tag) => tag.trim())
    }

    // Parse SEO keywords if they're sent as string
    if (contentData.seo && typeof contentData.seo.metaKeywords === 'string') {
      contentData.seo.metaKeywords = contentData.seo.metaKeywords
        .split(',')
        .map((keyword) => keyword.trim())
    }

    // Calculate read time (rough estimate: 200 words per minute)
    if (contentData.content) {
      const wordCount = contentData.content.split(/\s+/).length
      contentData.readTime = Math.ceil(wordCount / 200)
    }

    // Save in DB
    const content = new Content(contentData)
    await content.save()

    // Populate author details
    const populatedContent = await Content.findById(content._id).populate(
      'author',
      'name email',
    )

    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data: populatedContent,
    })
  } catch (error) {
    console.error('Error creating content:', error)
    res.status(400).json({
      success: false,
      message: 'Error creating content',
      error: error.message,
    })
  }
}

// Update content
const updateContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      })
    }

    const updateData = { ...req.body }

    // Handle file uploads
    if (req.files) {
      if (req.files.featuredImage) {
        updateData.featuredImage = `/uploads/content/${req.files.featuredImage[0].filename}`
      }
      if (req.files.videoThumbnail) {
        updateData.videoThumbnail = `/uploads/content/${req.files.videoThumbnail[0].filename}`
      }
    }

    // Parse tags if they're sent as string
    if (typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map((tag) => tag.trim())
    }

    // Parse SEO keywords if they're sent as string
    if (updateData.seo && typeof updateData.seo.metaKeywords === 'string') {
      updateData.seo.metaKeywords = updateData.seo.metaKeywords
        .split(',')
        .map((keyword) => keyword.trim())
    }

    // Recalculate read time if content is updated
    if (updateData.content) {
      const wordCount = updateData.content.split(/\s+/).length
      updateData.readTime = Math.ceil(wordCount / 200)
    }

    const updatedContent = await Content.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).populate('author', 'name email')

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: updatedContent,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating content',
      error: error.message,
    })
  }
}

// Delete content
const deleteContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      })
    }

    // Delete associated files
    if (content.featuredImage) {
      const imagePath = path.join(__dirname, '../../', content.featuredImage)
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }

    if (content.videoThumbnail) {
      const thumbnailPath = path.join(
        __dirname,
        '../../',
        content.videoThumbnail,
      )
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath)
      }
    }

    await Content.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Content deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting content',
      error: error.message,
    })
  }
}

// Get content categories
const getContentCategories = async (req, res) => {
  try {
    const categories = await Content.distinct('category')
    res.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    })
  }
}

// Get content stats
const getContentStats = async (req, res) => {
  try {
    const stats = await Content.aggregate([
      {
        $group: {
          _id: null,
          totalContent: { $sum: 1 },
          publishedContent: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
          },
          draftContent: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] },
          },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
        },
      },
    ])

    const typeStats = await Content.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ])

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalContent: 0,
          publishedContent: 0,
          draftContent: 0,
          totalViews: 0,
          totalLikes: 0,
        },
        byType: typeStats,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching content stats',
      error: error.message,
    })
  }
}

// Add view to public content (unique per visitorId)
const addViewPublic = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      })
    }

    const visitorId =
      (req.body && req.body.visitorId) || req.headers['x-visitor-id']
    if (!visitorId) {
      return res
        .status(400)
        .json({ success: false, message: 'visitorId required' })
    }

    const alreadyViewed = (content.viewedBy || []).includes(visitorId)
    if (!alreadyViewed) {
      content.viewedBy = [...(content.viewedBy || []), visitorId]
      content.views = (content.views || 0) + 1
      await content.save()
    }

    res.json({
      success: true,
      data: { views: content.views, alreadyViewed },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding view',
      error: error.message,
    })
  }
}

// Like content (auth required, unique per user)
const likeContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      })
    }

    const userId = req.user && req.user.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const likedBy = content.likedBy || []
    const hasLiked = likedBy.some((u) => String(u) === String(userId))
    if (!hasLiked) {
      content.likedBy = [...likedBy, userId]
      content.likes = (content.likes || 0) + 1
      await content.save()
    }

    res.json({
      success: true,
      data: { likes: content.likes, liked: true },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error liking content',
      error: error.message,
    })
  }
}

// Unlike content (auth required)
const unlikeContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      })
    }

    const userId = req.user && req.user.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const likedBy = content.likedBy || []
    const hasLiked = likedBy.some((u) => String(u) === String(userId))
    if (hasLiked) {
      content.likedBy = likedBy.filter((u) => String(u) !== String(userId))
      content.likes = Math.max(0, (content.likes || 0) - 1)
      await content.save()
    }

    res.json({
      success: true,
      data: { likes: content.likes, liked: false },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unliking content',
      error: error.message,
    })
  }
}

module.exports = {
  getAllContent,
  getPublishedContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  getContentCategories,
  getContentStats,
  addViewPublic,
  likeContent,
  unlikeContent,
}

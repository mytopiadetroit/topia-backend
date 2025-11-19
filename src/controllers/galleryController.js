const Gallery = require('../models/Gallery')

// Get all active gallery images (public)
const getActiveGalleryImages = async (req, res) => {
  try {
    const images = await Gallery.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('-uploadedBy')

    res.json({
      success: true,
      data: images,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching gallery images',
      error: error.message,
    })
  }
}

// Admin: Get all gallery images (including inactive)
const getAllGalleryImages = async (req, res) => {
  try {
    const images = await Gallery.find()

    res.json({
      success: true,
      data: images,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching gallery images',
      error: error.message,
    })
  }
}

// Admin: Upload new gallery image
const uploadGalleryImage = async (req, res) => {
  try {
    const { title, description, order } = req.body
    const adminId = req.user?.id

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      })
    }

    // Check if file was uploaded
    if (!req.file && !req.files) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      })
    }

    // Get image URL from uploaded file
    const file = req.file || (req.files && req.files.image ? req.files.image[0] : null)
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      })
    }

    const imageUrl = file.location || `/uploads/${file.filename}`

    const newImage = new Gallery({
      title,
      description: description || '',
      imageUrl,
      order: order || 0,
      uploadedBy: adminId,
    })

    await newImage.save()
    const populatedImage = await Gallery.findById(newImage._id).populate(
      'uploadedBy',
      'fullName email',
    )

    res.status(201).json({
      success: true,
      message: 'Gallery image uploaded successfully',
      data: populatedImage,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error uploading gallery image',
      error: error.message,
    })
  }
}

// Admin: Update gallery image
const updateGalleryImage = async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, order, isActive } = req.body

    const image = await Gallery.findById(id)
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Gallery image not found',
      })
    }

    if (title !== undefined) image.title = title
    if (description !== undefined) image.description = description
    if (order !== undefined) image.order = order
    if (isActive !== undefined) image.isActive = isActive

    // If new image file is uploaded, update imageUrl
    if (req.file || (req.files && req.files.image)) {
      const file = req.file || req.files.image[0]
      image.imageUrl = file.location || `/uploads/${file.filename}`
    }

    await image.save()
    const updatedImage = await Gallery.findById(image._id).populate(
      'uploadedBy',
      'fullName email',
    )

    res.json({
      success: true,
      message: 'Gallery image updated successfully',
      data: updatedImage,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating gallery image',
      error: error.message,
    })
  }
}

// Admin: Delete gallery image
const deleteGalleryImage = async (req, res) => {
  try {
    const { id } = req.params

    const image = await Gallery.findById(id)
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Gallery image not found',
      })
    }

    await Gallery.findByIdAndDelete(id)

    res.json({
      success: true,
      message: 'Gallery image deleted successfully',
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error deleting gallery image',
      error: error.message,
    })
  }
}

// Admin: Toggle image active status
const toggleGalleryImageStatus = async (req, res) => {
  try {
    const { id } = req.params

    const image = await Gallery.findById(id)
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Gallery image not found',
      })
    }

    image.isActive = !image.isActive
    await image.save()

    res.json({
      success: true,
      message: `Image ${image.isActive ? 'activated' : 'deactivated'} successfully`,
      data: image,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error toggling image status',
      error: error.message,
    })
  }
}

module.exports = {
  getActiveGalleryImages,
  getAllGalleryImages,
  uploadGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  toggleGalleryImageStatus,
}

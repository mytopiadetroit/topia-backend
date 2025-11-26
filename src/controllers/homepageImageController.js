const HomepageImage = require('../models/HomepageImage');

// Get all homepage images (public)
const getHomepageImages = async (req, res) => {
    try {
        const images = await HomepageImage.find({ isActive: true }).sort({ createdAt: -1 });

        // Format response with section-wise images
        const imageMap = {
            hero: null,
            mission: null,
            resource: null,
            circle: null
        };

        images.forEach(img => {
            if (!imageMap[img.section]) {
                imageMap[img.section] = img.image;
            }
        });

        res.json({
            success: true,
            data: imageMap,
            allImages: images
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching homepage images',
            error: error.message,
        });
    }
};

// Admin: Get all homepage images (including inactive)
const getAllHomepageImages = async (req, res) => {
    try {
        const { section } = req.query;
        const query = section ? { section } : {};
        
        const images = await HomepageImage.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: images,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching homepage images',
            error: error.message,
        });
    }
};

// Admin: Upload new homepage image
const uploadHomepageImage = async (req, res) => {
    try {
        const { section } = req.body;

        if (!section) {
            return res.status(400).json({
                success: false,
                message: 'Section is required',
            });
        }

        // Validate section
        const validSections = ['hero', 'mission', 'resource', 'circle'];
        if (!validSections.includes(section)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid section. Must be one of: hero, mission, resource, circle',
            });
        }

        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Image file is required',
            });
        }

        const imageUrl = file.location || `/uploads/${file.filename}`;

        const newImage = new HomepageImage({
            image: imageUrl,
            section: section,
            isActive: true
        });

        await newImage.save();

        res.status(201).json({
            success: true,
            message: 'Homepage image uploaded successfully',
            data: newImage,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error uploading homepage image',
            error: error.message,
        });
    }
};

// Admin: Update homepage image
const updateHomepageImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { section, isActive } = req.body;

        const image = await HomepageImage.findById(id);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Homepage image not found',
            });
        }

        if (section) {
            const validSections = ['hero', 'mission', 'resource', 'circle'];
            if (!validSections.includes(section)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid section',
                });
            }
            image.section = section;
        }

        if (isActive !== undefined) {
            image.isActive = isActive;
        }

        // If new image file is uploaded, update imageUrl
        if (req.file) {
            const file = req.file;
            image.image = file.location || `/uploads/${file.filename}`;
        }

        await image.save();

        res.json({
            success: true,
            message: 'Homepage image updated successfully',
            data: image,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating homepage image',
            error: error.message,
        });
    }
};

// Admin: Delete homepage image
const deleteHomepageImage = async (req, res) => {
    try {
        const { id } = req.params;

        const image = await HomepageImage.findById(id);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Homepage image not found',
            });
        }

        await HomepageImage.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Homepage image deleted successfully',
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error deleting homepage image',
            error: error.message,
        });
    }
};

// Admin: Toggle image active status
const toggleHomepageImageStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const image = await HomepageImage.findById(id);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Homepage image not found',
            });
        }

        image.isActive = !image.isActive;
        await image.save();

        res.json({
            success: true,
            message: `Image ${image.isActive ? 'activated' : 'deactivated'} successfully`,
            data: image,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error toggling image status',
            error: error.message,
        });
    }
};

module.exports = {
    getHomepageImages,
    getAllHomepageImages,
    uploadHomepageImage,
    updateHomepageImage,
    deleteHomepageImage,
    toggleHomepageImageStatus,
};

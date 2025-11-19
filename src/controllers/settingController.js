const setting = require("../models/setting")



// // Get all active setting images (public)
const getActivesettingImages = async (req, res) => {
    try {
        const images = await setting.find()

        res.json({
            success: true,
            data: images,
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching setting images',
            error: error.message,
        })
    }
}

// Admin: Get all setting images (including inactive)
const getAllsettingImages = async (req, res) => {
    try {
        let cond = {}
        if (req.query.pagename) {
            cond.pagename = req.query.pagename
        }
        const images = await setting.find(cond)

        res.json({
            success: true,
            data: images,
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching setting images',
            error: error.message,
        })
    }
}

// Admin: Upload new setting image
const uploadsettingImage = async (req, res) => {
    try {


        // // Check if file was uploaded
        // if (!req.file && !req.files) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Image file is required',
        //     })
        // }

        // // Get image URL from uploaded file
        const file = req.file || (req.file && req.files.image ? req.files.image[0] : null)
        // if (!file) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Image file is required',
        //     })
        // }
        console.log(file)

        const imageUrl = file.location || `/uploads/${file.filename}`

        const newImage = new setting({
            image: imageUrl,
            pagename: req.body.pagename
        })

        await newImage.save()

        res.status(201).json({
            success: true,
            message: 'setting image uploaded successfully',
            data: newImage,
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error uploading setting image',
            error: error.message,
        })
    }
}

// Admin: Update setting image
const updatesettingImage = async (req, res) => {
    try {
        const { id } = req.params
        const { pagename } = req.body

        const image = await setting.findById(id)
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'setting image not found',
            })
        }

        if (pagename !== undefined) image.pagename = pagename


        // If new image file is uploaded, update imageUrl
        if (req.file || (req.files && req.files.image)) {
            const file = req.file || req.files.image[0]
            image.image = file.location || `/uploads/${file.filename}`
        }

        await image.save()


        res.json({
            success: true,
            message: 'setting image updated successfully',
            data: image,
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating setting image',
            error: error.message,
        })
    }
}

// Admin: Delete setting image
const deletesettingImage = async (req, res) => {
    try {
        const { id } = req.params

        const image = await setting.findById(id)
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'setting image not found',
            })
        }

        await setting.findByIdAndDelete(id)

        res.json({
            success: true,
            message: 'setting image deleted successfully',
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error deleting setting image',
            error: error.message,
        })
    }
}

// Admin: Toggle image active status

module.exports = {
    getActivesettingImages,
    getAllsettingImages,
    uploadsettingImage,
    updatesettingImage,
    deletesettingImage,
    // togglesettingImageStatus,
}

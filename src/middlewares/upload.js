const multer = require('multer');

// Use memory storage instead of disk storage to avoid file system issues
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  console.log('=== MULTER DEBUG ===');
  console.log('Processing file:', file.originalname, 'Type:', file.mimetype);
  console.log('Field name:', file.fieldname);
  console.log('File size:', file.size);
  console.log('=== END MULTER DEBUG ===');
  
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload; 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const multerS3 = require('multer-s3');  
const { s3Client, bucketName } = require('../config/s3');


const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure S3 storage
const s3Storage = multerS3({
  s3: s3Client,
  bucket: bucketName,
  acl: 'public-read',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'government-ids/' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Fallback to disk storage if S3 is not configured
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Debug AWS configuration
console.log('AWS Configuration:');
console.log('AWS_ACCESS_KEY exists:', !!process.env.AWS_ACCESS_KEY);
console.log('BUCKET_NAME:', process.env.BUCKET_NAME);
console.log('BUCKET_REGION:', process.env.BUCKET_REGION);

// Use S3 storage if AWS credentials are available, otherwise use disk storage
const storage = process.env.AWS_ACCESS_KEY ? s3Storage : diskStorage;
console.log('Using storage:', process.env.AWS_ACCESS_KEY ? 'S3 Storage' : 'Disk Storage');

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
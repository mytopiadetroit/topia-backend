const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
require('dotenv').config();

// Debug AWS credentials
console.log('Initializing S3 client with:');
console.log('BUCKET_REGION:', process.env.BUCKET_REGION);
console.log('AWS_ACCESS_KEY exists:', !!process.env.AWS_ACCESS_KEY);
console.log('AWS_SECRET_KEY exists:', !!process.env.AWS_SECRET_KEY);
console.log('BUCKET_NAME:', process.env.BUCKET_NAME);

// AWS S3 configuration
const s3Client = new S3Client({
  region: process.env.BUCKET_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

// Export the S3 client
module.exports = {
  s3Client,
  bucketName: process.env.BUCKET_NAME || 'shroomtopia'
};
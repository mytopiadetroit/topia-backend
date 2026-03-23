// Quick test script for Google Reviews API
// Run with: node test-google-reviews.js

require('dotenv').config();
const axios = require('axios');

const PLACE_ID = 'ChIJi8kMdhvPJIgRMjwSMeT0pCw';
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

async function testGoogleReviews() {
  console.log('🔍 Testing Google Reviews API...\n');
  
  if (!API_KEY || API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
    console.error('❌ ERROR: GOOGLE_PLACES_API_KEY not set in .env file');
    console.log('\n📝 Please add your Google Places API key to .env:');
    console.log('   GOOGLE_PLACES_API_KEY=your_actual_key_here\n');
    return;
  }

  try {
    console.log('📍 Place ID:', PLACE_ID);
    console.log('🔑 API Key:', API_KEY.substring(0, 10) + '...\n');
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: PLACE_ID,
          fields: 'name,rating,user_ratings_total,reviews',
          key: API_KEY
        }
      }
    );

    if (response.data.status !== 'OK') {
      console.error('❌ API Error:', response.data.status);
      console.error('   Message:', response.data.error_message || 'No error message');
      return;
    }

    const result = response.data.result;
    
    console.log('✅ SUCCESS! Reviews fetched successfully\n');
    console.log('📊 Business Details:');
    console.log('   Name:', result.name);
    console.log('   Average Rating:', result.rating);
    console.log('   Total Reviews:', result.user_ratings_total);
    console.log('   Reviews Returned:', result.reviews?.length || 0);
    
    if (result.reviews && result.reviews.length > 0) {
      console.log('\n📝 Sample Review:');
      const review = result.reviews[0];
      console.log('   Author:', review.author_name);
      console.log('   Rating:', review.rating, '⭐');
      console.log('   Time:', review.relative_time_description);
      console.log('   Text:', review.text.substring(0, 100) + '...');
    }
    
    console.log('\n✨ Everything is working! You can now use the reviews on your website.');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testGoogleReviews();



const mongoose = require('mongoose');
const Content = require('../models/Content');
require('dotenv').config();


function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') 
    .replace(/\s+/g, '-') 
    .replace(/-+/g, '-')
    .substring(0, 100); 
}

async function addSlugsToContent() {
  try {

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
   

  
    const contentWithoutSlugs = await Content.find({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    });

  
    let updatedCount = 0;
    let skippedCount = 0;

    for (const content of contentWithoutSlugs) {
      try {
        let baseSlug = generateSlug(content.title);
        let slug = baseSlug;
        let counter = 1;
        
      
        while (true) {
          const existing = await Content.findOne({ 
            slug, 
            _id: { $ne: content._id } 
          });
          
          if (!existing) break;
          
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        
       
        content.slug = slug;
        await content.save();
        
     
        updatedCount++;
      } catch (error) {
        console.error(` Error processing "${content.title}":`, error.message);
        skippedCount++;
      }
    }



    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}


addSlugsToContent();

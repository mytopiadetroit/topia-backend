

const mongoose = require('mongoose');
const Deal = require('../models/Deal');
const Product = require('../models/Product');
require('dotenv').config();

async function migrateDealsToDealItems() {
  try {
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

   
    const dealsToMigrate = await Deal.find({
      $or: [
        { dealItems: { $exists: false } },
        { dealItems: { $size: 0 } }
      ],
      products: { $exists: true, $ne: [] }
    }).populate('products');

    console.log(`Found ${dealsToMigrate.length} deals to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const deal of dealsToMigrate) {
      const dealItems = [];

    
      for (const product of deal.products) {
        const fullProduct = await Product.findById(product._id);
        
        if (!fullProduct) {
          console.log(`Product ${product._id} not found, skipping`);
          continue;
        }

        
        if (fullProduct.hasVariants && fullProduct.variants && fullProduct.variants.length > 0) {
          for (const variant of fullProduct.variants) {
            dealItems.push({
              product: fullProduct._id,
              variantId: variant._id,
              flavorId: null
            });
          }
        }
      
        else if (fullProduct.flavors && fullProduct.flavors.length > 0) {
          for (const flavor of fullProduct.flavors.filter(f => f.isActive)) {
            dealItems.push({
              product: fullProduct._id,
              variantId: null,
              flavorId: flavor._id
            });
          }
        }
      
        else {
          console.log(`Product "${fullProduct.name}" has no variants or flavors, skipping`);
          skippedCount++;
        }
      }

      if (dealItems.length > 0) {
       
        await Deal.findByIdAndUpdate(deal._id, {
          dealItems: dealItems
        });
       
        migratedCount++;
      } else {
       
        skippedCount++;
      }
    }


    await mongoose.connection.close();
    console.log(' Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the migration
migrateDealsToDealItems();

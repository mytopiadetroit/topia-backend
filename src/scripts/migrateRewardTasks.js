const mongoose = require('mongoose');
const RewardTask = require('../models/RewardTask');
require('dotenv').config();

// Default tasks from the original system
const DEFAULT_TASKS = [
  { taskId: 'join-groove', title: 'Join Groove Group', reward: 1, order: 1 },
  { taskId: 'follow-ig', title: 'Follow Us On IG', reward: 1, order: 2 },
  { taskId: 'save-whatsapp', title: 'Save WhatsApp Contact', reward: 1, order: 3 },
  { taskId: 'google-review', title: 'Google Review', reward: 1, order: 4 },
  { taskId: 'tag-selfie', title: 'Tag Us Selfie Wall Photo', reward: 1, order: 5 },
  { taskId: 'first-experience', title: 'First Experience Share', reward: 1, order: 6 },
  { taskId: 'subscribe-yt', title: 'Subscribe YT Channel', reward: 1, order: 7 },
  { taskId: 'share-journey', title: 'Share Your Journey', reward: 1, order: 8 },
  { taskId: 'bring-friend', title: 'Bring a Friend', reward: 1, order: 9 },
  { taskId: 'special-reward', title: 'Special Reward', reward: 1, order: 10 },
];

async function migrateRewardTasks() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shroomtopia', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Get first admin user ID (you may need to adjust this)
    const User = require('../models/User');
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`Using admin user: ${admin.fullName || admin.email}`);

    // Check if tasks already exist
    const existingTasks = await RewardTask.countDocuments();
    
    if (existingTasks > 0) {
      console.log(`${existingTasks} reward tasks already exist in the database.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('Do you want to continue and add default tasks? (y/n): ', async (answer) => {
        if (answer.toLowerCase() !== 'y') {
          console.log('Migration cancelled.');
          readline.close();
          process.exit(0);
        }
        readline.close();
        await insertTasks(admin._id);
      });
    } else {
      await insertTasks(admin._id);
    }

  } catch (error) {
    console.error('Error migrating reward tasks:', error);
    process.exit(1);
  }
}

async function insertTasks(adminId) {
  try {
    // Insert default tasks
    for (const task of DEFAULT_TASKS) {
      const existingTask = await RewardTask.findOne({ taskId: task.taskId });
      
      if (existingTask) {
        console.log(`Task "${task.title}" already exists. Skipping...`);
      } else {
        await RewardTask.create({
          ...task,
          isVisible: true,
          description: '',
          createdBy: adminId,
        });
        console.log(`Created task: ${task.title}`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`Total tasks in database: ${await RewardTask.countDocuments()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error inserting tasks:', error);
    process.exit(1);
  }
}

// Run the migration
migrateRewardTasks();

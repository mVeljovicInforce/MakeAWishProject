const { db, initializeDatabase, addWish, getWishCount } = require('./database');
const fs = require('fs');
const path = require('path');

const sampleWishes = [
  "I wish I called my dad more often.",

  "I hope I’m not too old to start over.",

  "I want to see the ocean again. It’s been years.",

  "I should’ve told her how I felt when I had the chance.",

  "I just want a job I don’t hate waking up for.",

  "I’ve always wanted to learn guitar, but I keep putting it off.",

  "I hope my mom is proud of me, even if she doesn’t say it.",

  "I wish I could stop thinking about all the things I did wrong.",

  "I want to go somewhere far away where nobody knows me.",

  "I wish I worried less about what people think of me.",

  "I really need some good news this week.",

  "I want to write a book someday. Even if nobody reads it.",

  "There are a few things I’d give anything to do differently.",

  "I wish my brain would just be quiet for one day.",

  "I want someone to choose me for once.",

  "I’m sorry. I just don’t know how to say it to you.",

  "I hope the best part of my life hasn’t happened yet.",

  "I just want my family to know I’m trying.",

  "I have no idea what I’m doing with my life.",

  "I hope one day all of this makes sense."
];

async function seedDatabase() {
  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database
    await initializeDatabase();

    // Get current count
    const currentCount = await getWishCount();

    if (currentCount === 0) {
      console.log('🌱 Seeding database with sample wishes...');

      const now = Date.now();
      for (let i = 0; i < sampleWishes.length; i++) {
        const wish = sampleWishes[i];
        const daysAgo = Math.floor(i / 2);
        const timestamp = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
        await addWish(wish, timestamp);
      }

      const finalCount = await getWishCount();
      console.log(`✅ Database seeded! Added ${sampleWishes.length} wishes (total: ${finalCount})`);
    } else {
      console.log(`📚 Database already contains ${currentCount} wishes. Skipping seed.`);
    }

    db.close();
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase();

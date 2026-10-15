// Manual, idempotent seed script. The server also seeds an empty database automatically on startup
// (see initializeDatabase in database.js); both use the same data from seedData.js.
const { db, initializeDatabase, getWishCount } = require('./database');

async function seedDatabase() {
  try {
    const { seeded } = await initializeDatabase();
    const total = await getWishCount();

    if (seeded > 0) {
      console.log(`✅ Database seeded! Added ${seeded} wishes (total: ${total})`);
    } else {
      console.log(`📚 Database already contains ${total} wishes. Skipping seed.`);
    }

    db.close();
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase();

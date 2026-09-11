const express = require('express');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, addWish, getRandomWishes, getWishCount } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '1mb' }));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Routes

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Get random wishes
app.get('/api/wishes/random', async (req, res) => {
  try {
    const count = Math.min(Math.max(parseInt(req.query.count) || 3, 1), 10);
    const wishes = await getRandomWishes(count);
    res.json(wishes);
  } catch (err) {
    console.error('Error fetching wishes:', err);
    res.status(500).json({ error: 'Failed to fetch wishes' });
  }
});

// API: Submit a wish
app.post('/api/wishes', async (req, res) => {
  try {
    const { text } = req.body;

    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Wish text is required' });
    }

    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return res.status(400).json({ error: 'Wish cannot be empty' });
    }

    if (trimmed.length > 500) {
      return res.status(400).json({ error: 'Wish must be 500 characters or less' });
    }

    const wish = await addWish(trimmed);
    res.status(201).json(wish);
  } catch (err) {
    console.error('Error adding wish:', err);
    res.status(500).json({ error: 'Failed to add wish' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const count = await getWishCount();
    res.json({ status: 'ok', wishCount: count });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Start server
app.listen(PORT, async () => {
  try {
    await initializeDatabase();
    const count = await getWishCount();
    console.log(`✨ Hidden Wishes app running at http://localhost:${PORT}`);
    console.log(`📚 Database contains ${count} wishes`);
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
});

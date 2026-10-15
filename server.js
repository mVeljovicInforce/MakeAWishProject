const express = require('express');
const path = require('path');
const {
  initializeDatabase,
  addWish,
  getRandomWishes,
  getWishCount,
  getFeaturedWish,
  wishExists,
  addReaction
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

// Visitor keys are random browser-generated identifiers (crypto.randomUUID()); accept any
// reasonable opaque token so the format can evolve without breaking old browsers.
const VISITOR_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

// Middleware
app.use(express.static(publicDir));
app.use(express.json({ limit: '1mb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Website pages
const pages = {
  '/': 'index.html',
  '/wishes': 'wishes.html',
  '/make-a-wish': 'make-a-wish.html',
  '/about': 'about.html'
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(publicDir, file));
  });
});

// API: Get random wishes (optional ?count=1-10, optional ?exclude=<wish id>)
app.get('/api/wishes/random', async (req, res) => {
  try {
    const requested = parseInt(req.query.count, 10);
    const count = Number.isNaN(requested) ? 3 : Math.min(Math.max(requested, 1), 10);
    const excludeId = /^\d+$/.test(req.query.exclude || '') ? parseInt(req.query.exclude, 10) : null;
    const wishes = await getRandomWishes(count, excludeId > 0 ? excludeId : null);
    res.json({ wishes });
  } catch (err) {
    console.error('Error fetching wishes:', err);
    res.status(500).json({ error: 'Failed to fetch wishes' });
  }
});

// API: Get the single featured wish ({ wish: null } if none is featured)
app.get('/api/wishes/featured', async (req, res) => {
  try {
    const wish = await getFeaturedWish();
    res.json({ wish });
  } catch (err) {
    console.error('Error fetching featured wish:', err);
    res.status(500).json({ error: 'Failed to fetch wish' });
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
    res.status(201).json({ success: true, wish });
  } catch (err) {
    console.error('Error adding wish:', err);
    res.status(500).json({ error: 'Failed to add wish' });
  }
});

// API: Send a little light (one anonymous reaction per wish per browser).
// Never returns reaction totals or any reaction data.
app.post('/api/wishes/:id/react', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id) || parseInt(req.params.id, 10) < 1) {
      return res.status(400).json({ error: 'Invalid wish id' });
    }
    const wishId = parseInt(req.params.id, 10);

    const visitorKey = req.body && req.body.visitorKey;
    if (typeof visitorKey !== 'string' || !VISITOR_KEY_PATTERN.test(visitorKey)) {
      return res.status(400).json({ error: 'Invalid visitor key' });
    }

    if (!(await wishExists(wishId))) {
      return res.status(404).json({ error: 'Wish not found' });
    }

    // Duplicates are ignored by the UNIQUE(wish_id, visitor_key_hash) constraint.
    await addReaction(wishId, visitorKey);
    res.json({ success: true });
  } catch (err) {
    console.error('Error recording reaction:', err);
    res.status(500).json({ error: 'Failed to record reaction' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const count = await getWishCount();
    res.json({ status: 'ok', wishCount: count });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'error' });
  }
});

// Unknown API routes -> JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Unknown website routes -> custom 404 page
app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, '404.html'));
});

// Error handler: malformed JSON is a client error; everything else is a generic 500.
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request too large' });
  }
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Start server (initialize the database first so requests never hit a half-ready schema)
initializeDatabase()
  .then(async ({ seeded }) => {
    const count = await getWishCount();
    app.listen(PORT, () => {
      console.log(`✨ Hidden Wishes app running at http://localhost:${PORT}`);
      if (seeded > 0) console.log(`🌱 Seeded ${seeded} sample wishes (first run)`);
      console.log(`📚 Database contains ${count} wishes`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

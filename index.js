const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
require('dotenv').config();
const admin = require("./firebase");
const { connectToDatabase } = require('./db');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// TOKEN MIDDLEWARE

const verifyToken = async (req, res, next) => {
  const emailHeader = req.headers['x-user-email'];

  if (!admin) {
    if (!emailHeader) {
      return res.status(500).send({ success: false, message: "Authentication service not configured" });
    }
    req.user = { email: emailHeader };
    return next();
  }

  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).send({ success: false, message: "Unauthorized: No token" });
  }

  const token = authorization.split(" ")[1];
  console.log(" Token received:", token);

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log(" Token verified user:", decoded.email);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("Token invalid:", error);
    return res.status(401).send({ success: false, message: "Unauthorized: Invalid token" });
  }
};

// COLLECTIONS (initialized globally but populated via connection)
let db, issuesCollection, contributionsCollection, usersCollection;

// DB CONNECTION MANGEMENT MIDDLEWARE
// This ensures that for every request (including keep-alive), we have a valid DB connection
const ensureDbConnection = async (req, res, next) => {
  try {
    if (!db || !issuesCollection || !usersCollection) {
      const { db: connectedDb } = await connectToDatabase();
      db = connectedDb;
      issuesCollection = db.collection('issues');
      contributionsCollection = db.collection('my-contribution');
      usersCollection = db.collection('users');
    }
    next();
  } catch (err) {
    console.error("Failed to connect to DB in middleware:", err);
    res.status(500).send({ success: false, message: "Database Connection Failed" });
  }
};

// Apply DB connection check to all API routes
app.use(ensureDbConnection);

// KEEP ALIVE ENDPOINT (For Vercel Cron)
app.get('/api/keep-alive', async (req, res) => {
  // ensureDbConnection has already run, so if we are here, DB is connected.
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    message: "Server is warm and DB is connected"
  });
});

// USERS & ROLE ROUTES
app.post('/users', async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const updateDoc = {
    $set: {
      name: user.name,
      email: user.email,
      photo: user.photo,
      lastLogin: new Date()
    },
    $setOnInsert: {
      role: user.email === 'admin@eco.com' ? 'admin' : 'user',
      createdAt: new Date()
    }
  };

  const result = await usersCollection.updateOne(query, updateDoc, { upsert: true });
  res.send(result);
});

// Check if user is admin
app.get('/users/admin/:email', verifyToken, async (req, res) => {
  const email = req.params.email;

  if (email !== req.user.email) {
    return res.status(403).send({ message: 'Forbidden access' });
  }

  const user = await usersCollection.findOne({ email });
  let admin = false;
  if (user) {
    admin = user?.role === 'admin';
  }
  res.send({ admin });
});


// ISSUES ROUTES
app.get('/issues', async (req, res) => {
  try {
    const { search, category, status, sort, page = 1, limit = 8 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    let sortQuery = { date: -1 };
    if (sort === 'date_asc') sortQuery = { date: 1 };
    if (sort === 'title_asc') sortQuery = { title: 1 };
    if (sort === 'title_desc') sortQuery = { title: -1 };
    if (sort === 'amount_asc') sortQuery = { amount: 1 };
    if (sort === 'amount_desc') sortQuery = { amount: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const totalCount = await issuesCollection.countDocuments(query);
    const result = await issuesCollection.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.send({ result, totalCount, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Error fetching issues" });
  }
});

app.get('/issues/recent', async (req, res) => {
  try {
    const recent = await issuesCollection.find().sort({ date: -1 }).limit(6).toArray();
    res.send(recent);
  } catch (err) {
    res.status(500).send({ success: false, message: "Error fetching recent issues" });
  }
});

app.post('/issues', verifyToken, async (req, res) => {
  const data = req.body;
  data.email = req.user.email;
  data.date = new Date();
  const result = await issuesCollection.insertOne(data);
  res.send({ success: true, result });
});

app.get('/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const objectId = new ObjectId(id);
    const result = await issuesCollection.findOne({ _id: objectId });
    if (!result) return res.status(404).send({ success: false, message: "Issue not found" });
    res.send({ success: true, result });
  } catch (err) {
    res.status(500).send({ success: false, message: "Error fetching issue" });
  }
});

app.get('/my-issues/:email', verifyToken, async (req, res) => {
  const emailParam = req.params.email;
  if (req.user.email !== emailParam) {
    return res.status(403).send({ success: false, message: "Forbidden: Email mismatch" });
  }
  const result = await issuesCollection.find({ email: emailParam }).toArray();
  res.send(result);
});

app.put('/issues/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const updateFields = req.body;
  const issue = await issuesCollection.findOne({ _id: new ObjectId(id) });
  if (!issue) return res.status(404).send({ success: false, message: "Issue not found" });
  if (issue.email !== req.user.email) return res.status(403).send({ success: false, message: "Forbidden" });
  const result = await issuesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
  res.send({ success: true, result });
});

app.delete('/issues/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const issue = await issuesCollection.findOne({ _id: new ObjectId(id) });
  if (!issue) return res.status(404).send({ success: false, message: "Issue not found" });
  if (issue.email !== req.user.email) return res.status(403).send({ success: false, message: "Forbidden" });
  const result = await issuesCollection.deleteOne({ _id: new ObjectId(id) });
  res.send({ success: true, result });
});

// CONTRIBUTIONS ROUTES
app.post('/my-contribution', verifyToken, async (req, res) => {
  try {
    const data = req.body;
    data.email = req.user.email;
    data.date = new Date();
    const result = await contributionsCollection.insertOne(data);
    res.send({ success: true, result });
  } catch (err) {
    res.status(500).send({ success: false, message: "Failed" });
  }
});

app.get('/my-contribution', verifyToken, async (req, res) => {
  try {
    const email = req.user.email;
    const result = await contributionsCollection.find({ email }).toArray();
    res.send({ success: true, result });
  } catch (err) {
    res.status(500).send({ success: false, message: "Failed" });
  }
});

app.get('/my-contribution/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await contributionsCollection.findOne({ _id: new ObjectId(id) });
    res.send({ success: true, result });
  } catch (err) {
    res.status(500).send({ success: false, message: "Failed" });
  }
});

// FAVORITES ROUTES
app.get('/users/favorites/:email', verifyToken, async (req, res) => {
  try {
    const email = req.params.email;
    if (req.user.email !== email) return res.status(403).send({ message: "Forbidden" });
    const user = await usersCollection.findOne({ email });
    res.send({ success: true, favorites: user?.favorites || [] });
  } catch (err) {
    res.status(500).send({ success: false, message: "Failed" });
  }
});

app.post('/users/favorites', verifyToken, async (req, res) => {
  try {
    const { issueId } = req.body;
    const email = req.user.email;
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found" });
    const favorites = user.favorites || [];
    const isFavorited = favorites.includes(issueId);
    const updateDoc = isFavorited ? { $pull: { favorites: issueId } } : { $addToSet: { favorites: issueId } };
    await usersCollection.updateOne({ email }, updateDoc);
    res.send({ success: true, isLiked: !isFavorited });
  } catch (err) {
    res.status(500).send({ success: false, message: "Failed" });
  }
});

app.get('/', (req, res) => {
  res.send("EcoFine Backend Running");
});

if (require.main === module) {
  const startServer = (currentPort, attempts = 0) => {
    if (attempts > 5) {
      console.error(`Failed to start server after multiple attempts`);
      return;
    }

    const server = app.listen(currentPort, () => {
      console.log(`🚀 Server running at http://localhost:${currentPort}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        const nextPort = currentPort + 1;
        console.error(`Port ${currentPort} is in use, trying port ${nextPort}`);
        startServer(nextPort, attempts + 1);
      } else {
        console.error('Server error:', error);
      }
    });
  };

  startServer(port);
}

module.exports = app;

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const admin = require('./firebase'); // Firebase Admin config

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// -------------------
// VERIFY TOKEN MIDDLEWARE
// -------------------
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ success: false, message: "Unauthorized: Missing token" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // store decoded Firebase user
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    res.status(403).send({ success: false, message: "Forbidden: Invalid or expired token" });
  }
}

// -------------------
// DATABASE CONNECTION
// -------------------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const issuesCollection = db.collection('issues');
    const contributionsCollection = db.collection('my-contribution');

    // -------------------
    // ISSUES ROUTES
    // -------------------

    // ✅ Get all issues (Public)
    app.get('/issues', async (req, res) => {
      const result = await issuesCollection.find().toArray();
      res.send(result);
    });

    // ✅ Add new issue (Protected)
    app.post('/issues', verifyToken, async (req, res) => {
      try {
        const data = req.body;
        const issue = {
          ...data,
          createdBy: req.user.email, // Add logged-in user's email
          createdAt: new Date(),
        };
        const result = await issuesCollection.insertOne(issue);
        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Failed to add issue' });
      }
    });

    // ✅ Get single issue (Public)
    app.get('/issues/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await issuesCollection.findOne({ _id: new ObjectId(id) });
        if (!result) return res.status(404).send({ success: false, message: 'Issue not found' });
        res.send({ success: true, result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: 'Error fetching issue' });
      }
    });

    // ✅ Delete issue (Protected)
    app.delete('/issues/:id', verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await issuesCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          res.send({ success: true, message: 'Issue deleted successfully' });
        } else {
          res.status(404).send({ success: false, message: 'Issue not found' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Failed to delete issue' });
      }
    });

    // -------------------
    // MY CONTRIBUTION ROUTES
    // -------------------

    // ✅ Add contribution (Protected)
    app.post('/my-contribution', verifyToken, async (req, res) => {
      try {
        const data = req.body;
        if (!data.issueId || !data.amount) {
          return res.status(400).send({ success: false, message: 'Missing required fields' });
        }

        const contribution = {
          ...data,
          email: req.user.email,
          createdAt: new Date(),
        };

        const result = await contributionsCollection.insertOne(contribution);
        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Failed to save contribution' });
      }
    });

    // ✅ Fetch user contributions (Protected)
    app.get('/my-contribution', verifyToken, async (req, res) => {
      try {
        const email = req.user.email;
        const result = await contributionsCollection.find({ email }).toArray();
        res.send({ success: true, result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: 'Failed to fetch contributions' });
      }
    });

    console.log('✅ Connected to MongoDB successfully!');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
}

run().catch(console.dir);

// -------------------
// ROOT ROUTE
// -------------------
app.get('/', (req, res) => {
  res.send('🔥 Server is running with Firebase Auth protection!');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

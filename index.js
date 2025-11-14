const express = require('express'); 
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------------------------
// FIREBASE ADMIN INITIALIZE
// ---------------------------
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ---------------------------
// TOKEN MIDDLEWARE
// ---------------------------
const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).send({ success: false, message: "Unauthorized: No token" });
  }

  const token = authorization.split(" ")[1];
  console.log("📌 Token received:", token);

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("✅ Token verified user:", decoded.email);
    req.user = decoded; // save decoded user details
    next();
  } catch (error) {
    console.log("❌ Token invalid:", error);
    return res.status(401).send({ success: false, message: "Unauthorized: Invalid token" });
  }
};

// ---------------------------
// DATABASE CONNECTION
// ---------------------------
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
    const db = client.db(process.env.DB_NAME);

    const issuesCollection = db.collection('issues');
    const contributionsCollection = db.collection('my-contribution');

    console.log("✅ MongoDB Connected!");

    // ---------------------------
    // ISSUES ROUTES
    // ---------------------------

    // Get all issues with optional filtering
    app.get('/issues', async (req, res) => {
      const query = {};
      if (req.query.category) query.category = req.query.category;
      if (req.query.status) query.status = req.query.status;

      const result = await issuesCollection.find(query).toArray();
      res.send(result);
    });

    // Get recent 6 issues
    app.get('/issues/recent', async (req, res) => {
      const recent = await issuesCollection.find().sort({ date: -1 }).limit(6).toArray();
      res.send(recent);
    });

    // Add a new issue
    app.post('/issues', verifyToken, async (req, res) => {
      const data = req.body;
      data.email = req.user.email; // secure email
      data.date = new Date();
      const result = await issuesCollection.insertOne(data);
      res.send({ success: true, result });
    });

    // Get single issue by ID (use only /issues/:id)
    app.get('/issues/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const objectId = new ObjectId(id);
        const result = await issuesCollection.findOne({ _id: objectId });
        if (!result) return res.status(404).send({ success: false, message: "Issue not found" });
        res.send({ success: true, result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Error fetching issue" });
      }
    });

    // Get issues reported by a specific user
    app.get('/my-issues/:email', verifyToken, async (req, res) => {
      const emailParam = req.params.email;
      if (req.user.email !== emailParam) {
        return res.status(403).send({ success: false, message: "Forbidden: Email mismatch" });
      }
      const result = await issuesCollection.find({ email: emailParam }).toArray();
      res.send(result);
    });

    // Update issue by ID (owner only)
    app.put('/issues/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const updateFields = req.body;

      const issue = await issuesCollection.findOne({ _id: new ObjectId(id) });
      if (!issue) return res.status(404).send({ success: false, message: "Issue not found" });
      if (issue.email !== req.user.email) return res.status(403).send({ success: false, message: "Forbidden: Not the owner" });

      const result = await issuesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateFields }
      );

      res.send({ success: true, result });
    });

    // Delete issue by ID (owner only)
    app.delete('/issues/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const issue = await issuesCollection.findOne({ _id: new ObjectId(id) });
      if (!issue) return res.status(404).send({ success: false, message: "Issue not found" });
      if (issue.email !== req.user.email) return res.status(403).send({ success: false, message: "Forbidden: Not the owner" });

      const result = await issuesCollection.deleteOne({ _id: new ObjectId(id) });
      res.send({ success: true, message: "Issue deleted successfully", result });
    });

    // ---------------------------
    // CONTRIBUTIONS ROUTES
    // ---------------------------

    // Add new contribution
    app.post('/my-contribution', verifyToken, async (req, res) => {
      try {
        const data = req.body;
        data.email = req.user.email; // secure email
        data.date = new Date();

        const result = await contributionsCollection.insertOne(data);
        res.send({ success: true, result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Failed to save contribution" });
      }
    });

    // Get contributions of logged-in user
    app.get('/my-contribution', verifyToken, async (req, res) => {
      try {
        const email = req.user.email;
        const result = await contributionsCollection.find({ email }).toArray();
        res.send({ success: true, result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Failed to fetch contributions" });
      }
    });

    // Get single contribution by ID (use only /my-contribution/:id)
    app.get('/my-contribution/:id', verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const objectId = new ObjectId(id);
        const result = await contributionsCollection.findOne({ _id: objectId });
        if (!result) return res.status(404).send({ success: false, message: "Contribution not found" });
        res.send({ success: true, result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Failed to fetch contribution" });
      }
    });

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}

run().catch(console.dir);

// ---------------------------
// BASE ROUTE
// ---------------------------
app.get('/', (req, res) => {
  res.send("EcoFine Backend Running with Token Auth");
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

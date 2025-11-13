const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

    // Get all issues
    app.get('/issues', async (req, res) => {
      const result = await issuesCollection.find().toArray();
      res.send(result);
    });

    // Add a new issue
    app.post('/issues', async (req, res) => {
      const data = req.body;
      const result = await issuesCollection.insertOne(data);
      res.send({ success: true, result });
    });

    // Get single issue by ID
    app.get('/issues/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const objectId = new ObjectId(id);
        const result = await issuesCollection.findOne({ _id: objectId });
        if (!result)
          return res.status(404).send({ success: false, message: 'Issue not found' });
        res.send({ success: true, result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: 'Error fetching issue' });
      }
    });

    // ✅ DELETE issue by ID
    app.delete('/issues/:id', async (req, res) => {
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
        res.status(500).send({ success: false, message: 'Failed to delete issue', error });
      }
    });

    // -------------------
    // MY CONTRIBUTION ROUTES
    // -------------------

    // Add a new contribution
    app.post('/my-contribution', async (req, res) => {
      try {
        const data = req.body;
        if (!data.email || !data.issueId || !data.amount) {
          return res.status(400).send({ success: false, message: 'Missing required fields' });
        }
        const result = await contributionsCollection.insertOne(data);
        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Failed to save contribution' });
      }
    });

    // Fetch contributions by user email
    app.get('/my-contribution', async (req, res) => {
      try {
        const { email } = req.query;
        let query = {};
        if (email) query.email = email.toLowerCase();
        const result = await contributionsCollection.find(query).toArray();
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

// Root route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

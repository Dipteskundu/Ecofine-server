const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB connection URI
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

    // Collections
    const issuesCollection = db.collection('issues');
    const contributionCollection = db.collection('my-contribution');


    //  ISSUES ROUTES


    // Get all issues
    app.get('/issues', async (req, res) => {
      const result = await issuesCollection.find().toArray();
      res.send(result);
    });

    // Post a new issue
    app.post('/issues', async (req, res) => {
      try {
        const data = req.body;
        const result = await issuesCollection.insertOne(data);
        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Insert failed' });
      }
    });

    // Get issue details by ID
    app.get('/issues/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const objectId = new ObjectId(id);
        const result = await issuesCollection.findOne({ _id: objectId });
        if (!result)
          return res
            .status(404)
            .send({ success: false, message: 'Issue not found' });
        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: 'Error fetching issue' });
      }
    });


    //  MY CONTRIBUTION ROUTES


    // Get all contributions
    app.get('/my-contribution', async (req, res) => {
      const result = await contributionCollection.find().toArray();
      res.send(result);
    });

    // Post a new contribution
    app.post('/my-contribution', async (req, res) => {
      try {
        const data = req.body;
        const result = await contributionCollection.insertOne(data);
        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Insert failed' });
      }
    });

    // Get single contribution by ID
    app.get('/my-contribution/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const objectId = new ObjectId(id);
        const result = await contributionCollection.findOne({ _id: objectId });
        if (!result)
          return res
            .status(404)
            .send({ success: false, message: 'Contribution not found' });
        res.send({ success: true, result });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ success: false, message: 'Error fetching contribution' });
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
  res.send('Hello World! Server is running.');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config(); //  Load env variables

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

//  Build MongoDB URI from environment variables
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}.mongodb.net/?appName=${process.env.DB_NAME}`;

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
    const modelCollection = db.collection('issues');

    app.get('/issues', async (req, res) => {
      const result = await modelCollection.find().toArray();
      res.send(result);
    });

    app.post('/issues', async(req, res) => {
      const data = req.body
      console.log(data);
      const result = await
      modelCollection.insertOne(data)

      res.send({
        success:true,
        result
      })
      
    })




    await client.db('admin').command({ ping: 1 });
    console.log('✅ Connected to MongoDB successfully!');
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(` Server running on port ${port}`);
});

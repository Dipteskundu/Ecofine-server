const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

// Global cache to prevent multiple connections in serverless environment
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Create a new client instance if one doesn't exist
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    cachedClient = client;
    cachedDb = db;
    
    console.log("MongoDB Connected Successfully");
    return { client: cachedClient, db: cachedDb };
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    throw error;
  }
}

module.exports = { connectToDatabase };

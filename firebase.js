const admin = require("firebase-admin");

let initializedAdmin = null;

try {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT env is missing");
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    initializedAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    initializedAdmin = admin.app();
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error.message);
}

module.exports = admin.apps.length ? admin : null;

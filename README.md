# EcoFine Server

## Description
The backend API for the EcoFine platform. It handles data persistence, authentication verification, and business logic for managing environmental issue reports, blog posts, and user profiles. Built with a scalable Node.js and Express architecture connected to MongoDB.



## Technologies Used
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via native driver)
- **Authentication:** Firebase Admin SDK
- **Security:** CORS, Environment Variables
- **Architecture:** RESTful API

## Core Features
1.  **Issue Management:** CRUD operations for environmental reports.
2.  **Secure Endpoints:** Interactions verified via Firebase ID Tokens.
3.  **Database Integration:** Efficient queries and aggregation using MongoDB.
4.  **Scalable Structure:** Modular route handling and error management.

## Dependencies
- `express` - Web framework.
- `mongodb` - Database driver.
- `firebase-admin` - Server-side authentication verification.
- `cors` - Cross-Origin Resource Sharing.
- `dotenv` - Environment variable management.

## How to Run Locally

### Prerequisites
- Node.js installed.
- MongoDB connection string.
- Firebase Service Account credentials.

### Steps
1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment Variables:**
    - Create a `.env` file in the root of the `server` folder.
    - Add the following variables:
      ```env
      PORT=5000
      DB_USER=<your-db-user>
      DB_PASS=<your-db-password>
      # Add any other required keys
      ```
4.  **Start the server:**
    ```bash
    npm start
    ```
    - The server should run on `http://localhost:5000`.

## Resources
- [Express Documentation](https://expressjs.com/)
- [MongoDB Node Driver Docs](https://www.mongodb.com/docs/drivers/node/current/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

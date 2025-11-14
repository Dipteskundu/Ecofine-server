## EcoFine Backend Server
This is the backend server for the EcoFine project. It handles issues and contributions using MongoDB and Firebase Authentication.

## Features
Connects to MongoDB database.
Secures routes with Firebase ID Tokens.
Manage issues:
Add, update, delete, and get issues.
Get issues by category, status, or user email.
Manage contributions:
Add and view contributions by logged-in users.
Returns proper success/error messages for all requests.

## Technologies Used

Node.js & Express.js – Server framework
MongoDB – Database
Firebase Admin SDK – Authentication & token verification
CORS – Cross-Origin support
dotenv – Environment variable management
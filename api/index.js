const connectDB = require('../database/connectDB');
const app = require('../index.js');

// Vercel calls this file as a serverless function for every request.
// We must ensure DB is connected before passing to Express.
module.exports = async (req, res) => {
    await connectDB();
    return app(req, res);
};
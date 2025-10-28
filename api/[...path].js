// Vercel serverless function wrapper
// This handles all /api/* requests by importing the main server

const app = require('../server.js');

module.exports = app;


const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/dbconnection');

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Connect to the database
connectDB();

// Routes
app.use('/api/events', require('./routes/backendevents'));
app.use('/api/login', require('./routes/backendlogin'));
app.use('/api/signup', require('./routes/backendsignup'));
app.use('/api/profile', require('./routes/backendprofile'));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

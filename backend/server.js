const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/dbconnection'); // MongoDB connection function

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors());

const corsOptions = {
  origin: '*', // replace with your actual Vercel frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: 'Content-Type,Authorization',
};
// Connect to the database
connectDB();

// Routes
app.use('/api/signup', require('./routes/backendsignup'));
//hello
app.use('/api/login', require('./routes/backendlogin')); 
app.use('/api/event',require('./models/events'))

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

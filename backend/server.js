const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/dbconnection');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// Connect to the database
connectDB();

// Error handling for database connection
app.use((err, req, res, next) => {
    console.error('Database connection error:', err);
    res.status(500).json({
        success: false,
        message: 'Database connection error'
    });
});

// Routes
app.use('/api/events', require('./routes/backendevents'));
app.use('/api/login', require('./routes/backendlogin'));
app.use('/api/signup', require('./routes/backendsignup'));
app.use('/api/profile', require('./routes/backendprofile'));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
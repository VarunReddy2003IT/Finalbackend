const express = require('express');
const router = express.Router();
const Event = require('../models/events'); // Import your events model

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find(); // Fetch all events
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;

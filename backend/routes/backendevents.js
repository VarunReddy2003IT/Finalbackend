const express = require('express');
const router = express.Router();
const Event = require('../models/events');

// GET events (filter by 'upcoming' or 'past' dynamically)
router.get('/', async (req, res) => {
  try {
    const currentDate = new Date();

    // Fetch all events
    const events = await Event.find();

    // Filter events into 'upcoming' or 'past' based on the date
    const categorizedEvents = {
      upcoming: events.filter(event => new Date(event.date) > currentDate),
      past: events.filter(event => new Date(event.date) <= currentDate),
    };

    res.json(categorizedEvents); // Return events categorized by type
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Event = require('../models/events');

// Fetch all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find(); // Fetch all events from the database
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create a new event (for a lead/admin)
router.post('/add', async (req, res) => {
  try {
    // Extract event details from the request body
    const { eventname, clubtype, club, image, date, type } = req.body;

    // Validate input fields
    if (!eventname || !clubtype || !club || !date || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create a new event
    const newEvent = new Event({
      eventname,
      clubtype,
      club,
      image: image || '',  // Default to an empty string if no image is provided
      date,
      type
    });

    // Save the event to the database
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent); // Return the saved event
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Fetch events based on the club name (for specific clubs)
router.get('/club/:clubName', async (req, res) => {
  try {
    const { clubName } = req.params;
    const events = await Event.find({ club: clubName }); // Filter events by club name
    res.json(events);
  } catch (error) {
    console.error('Error fetching club events:', error);
    res.status(500).json({ error: 'Failed to fetch club events' });
  }
});

// Fetch upcoming events
router.get('/upcoming', async (req, res) => {
  try {
    const events = await Event.find({ type: 'upcoming' }); // Filter events by type
    res.json(events);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Fetch past events
router.get('/past', async (req, res) => {
  try {
    const events = await Event.find({ type: 'past' }); // Filter events by type
    res.json(events);
  } catch (error) {
    console.error('Error fetching past events:', error);
    res.status(500).json({ error: 'Failed to fetch past events' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Event = require('../models/events');

// Fetch all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create a new event
router.post('/add', async (req, res) => {
  try {
    const { eventname, clubtype, club, image, date, description, type, registrationLink } = req.body;

    // Validate required fields
    if (!eventname || !clubtype || !club || !date || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate registration link for upcoming events
    if (type === 'upcoming' && !registrationLink) {
      return res.status(400).json({ error: 'Registration link is required for upcoming events' });
    }

    // Create new event object
    const newEvent = new Event({
      eventname,
      clubtype,
      club,
      image: image || '',
      date,
      description,
      type,
      registrationLink: type === 'upcoming' ? registrationLink : undefined
    });

    // Save the event
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Fetch events for a specific club
router.get('/club/:clubName', async (req, res) => {
  try {
    const { clubName } = req.params;
    const events = await Event.find({ club: clubName });
    res.json(events);
  } catch (error) {
    console.error('Error fetching club events:', error);
    res.status(500).json({ error: 'Failed to fetch club events' });
  }
});

// Fetch upcoming events for technical clubtype
router.get('/upcoming', async (req, res) => {
  try {
    const events = await Event.find({ clubtype: 'Technical', type: 'upcoming' });
    res.json(events);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Fetch past events for technical clubtype
router.get('/past', async (req, res) => {
  try {
    const events = await Event.find({ clubtype: 'Technical', type: 'past' });
    res.json(events);
  } catch (error) {
    console.error('Error fetching past events:', error);
    res.status(500).json({ error: 'Failed to fetch past events' });
  }
});

module.exports = router;

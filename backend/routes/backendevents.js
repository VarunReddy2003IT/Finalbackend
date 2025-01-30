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

    // Validate clubtype
    if (!['Technical', 'Social'].includes(clubtype)) {
      return res.status(400).json({ error: 'Invalid clubtype. Must be either Technical or Social' });
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

// Fetch upcoming events by clubtype
router.get('/upcoming/:clubtype?', async (req, res) => {
  try {
    const { clubtype } = req.params;
    const query = { type: 'upcoming' };
    
    // Add clubtype to query if provided
    if (clubtype) {
      query.clubtype = clubtype;
    }
    
    const events = await Event.find(query);
    res.json(events);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Fetch past events by clubtype
router.get('/past/:clubtype?', async (req, res) => {
  try {
    const { clubtype } = req.params;
    const query = { type: 'past' };
    
    // Add clubtype to query if provided
    if (clubtype) {
      query.clubtype = clubtype;
    }
    
    const events = await Event.find(query);
    res.json(events);
  } catch (error) {
    console.error('Error fetching past events:', error);
    res.status(500).json({ error: 'Failed to fetch past events' });
  }
});

// Fetch all events by clubtype
router.get('/clubtype/:clubtype', async (req, res) => {
  try {
    const { clubtype } = req.params;
    const events = await Event.find({ clubtype });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events by clubtype:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;
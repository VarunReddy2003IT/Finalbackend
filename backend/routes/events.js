const express = require('express');
const ClubEvent = require('../models/ClubEvent'); // Import the ClubEvent model
const router = express.Router();

// GET: Fetch all events (upcoming and past)
router.get('/', async (req, res) => {
  try {
    const upcomingEvents = await ClubEvent.find({ type: 'upcoming' });
    const pastEvents = await ClubEvent.find({ type: 'past' });

    res.json({
      upcoming: upcomingEvents,
      past: pastEvents
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// POST: Add a new event
router.post('/', async (req, res) => {
  const { name, description, image, type } = req.body;

  try {
    const newEvent = new ClubEvent({ name, description, image, type });
    await newEvent.save();
    res.status(201).json({ message: 'Event added successfully', event: newEvent });
  } catch (error) {
    console.error('Error adding event:', error);
    res.status(400).json({ message: 'Failed to add event' });
  }
});

module.exports = router;

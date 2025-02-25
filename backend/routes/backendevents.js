const express = require('express');
const router = express.Router();
const Event = require('../models/events');
const Member = require('../models/member'); // Add this import
const Lead = require('../models/lead');

// Fetch all events sorted by date
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create a new event
router.post('/add', async (req, res) => {
  try {
    const { 
      eventname, 
      clubtype, 
      club, 
      image, 
      date, 
      description,
      paymentRequired,
      paymentLink 
    } = req.body;

    if (!eventname || !clubtype || !club || !date || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['Technical', 'Social', 'Cultural'].includes(clubtype)) {
      return res.status(400).json({ 
        error: 'Invalid clubtype. Must be either Technical, Social, or Cultural' 
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const type = date >= today ? 'upcoming' : 'past';

    // Validate payment link if payment is required for upcoming events
    if (paymentRequired && type === 'upcoming' && !paymentLink) {
      return res.status(400).json({ error: 'Payment link is required when payment is enabled' });
    }

    const newEvent = new Event({
      eventname,
      clubtype,
      club,
      image: image || '',
      date,
      description,
      type,
      paymentRequired: paymentRequired || false,
      paymentLink: paymentRequired ? paymentLink : undefined
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Delete an event by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await Event.findByIdAndDelete(id);

    if (!deletedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Fetch events for a specific club
router.get('/club/:clubName', async (req, res) => {
  try {
    const { clubName } = req.params;
    const events = await Event.find({ club: clubName }).sort({ date: 1 });
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
    const today = new Date().toISOString().split('T')[0];
    const query = { date: { $gte: today } };

    if (clubtype) {
      query.clubtype = clubtype;
    }
    
    const events = await Event.find(query).sort({ date: 1 });
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
    const today = new Date().toISOString().split('T')[0];
    const query = { date: { $lt: today } };

    if (clubtype) {
      query.clubtype = clubtype;
    }
    
    const events = await Event.find(query).sort({ date: -1 });
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
    const events = await Event.find({ clubtype }).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events by clubtype:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.post('/register/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userEmail } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if already registered
    if (event.registeredEmails.includes(userEmail)) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Add email to registered list
    event.registeredEmails.push(userEmail);
    await event.save();

    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// Get registered members' profiles
router.get('/registered-profiles/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Fetch profiles from both Member and Lead collections
    const memberProfiles = await Member.find({ 
      email: { $in: event.registeredEmails }
    }).select('name email collegeId mobilenumber imageUrl');

    const leadProfiles = await Lead.find({ 
      email: { $in: event.registeredEmails }
    }).select('name email collegeId mobilenumber imageUrl');

    // Combine and remove duplicates based on email
    const allProfiles = [...memberProfiles, ...leadProfiles];
    const uniqueProfiles = Array.from(
      new Map(allProfiles.map(profile => [profile.email, profile])).values()
    );

    res.json(uniqueProfiles);
  } catch (error) {
    console.error('Error fetching registered profiles:', error);
    res.status(500).json({ error: 'Failed to fetch registered profiles' });
  }
});

router.post('/upload-document/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { documentUrl } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.documentUrl = documentUrl;
    await event.save();

    res.json({ message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

router.post('/mark-participation/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userEmail, participated, eventDetails } = req.body;
    console.log(userEmail);
    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if the user is registered
    if (!event.registeredEmails.includes(userEmail)) {
      return res.status(400).json({ error: 'User not registered for this event' });
    }

    // Function to update participation
    const updateParticipation = async () => {
      await Member.findOneAndUpdate(
        { email: userEmail },
        { $addToSet: { participatedEvents: eventDetails } }, // Ensures uniqueness
        { new: true } // Returns the updated document
      );
      await Lead.findOneAndUpdate(
        { email: userEmail },
        { $addToSet: { participatedEvents: eventDetails } }, // Ensures uniqueness
        { new: true } // Returns the updated document
      );
    };

    if (participated && eventDetails) {
      await updateParticipation(Member);
      await updateParticipation(Lead);
    }

    res.json({ 
      message: participated ? 
        'User marked as participated' : 
        'User marked as not participated' 
    });
  } catch (error) {
    console.error('Error marking participation:', error);
    res.status(500).json({ error: 'Failed to mark participation status' });
  }
});


// New route to remove user registration
router.post('/remove-registration/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userEmail } = req.body;

    // Find and update the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Remove email from registeredEmails array
    event.registeredEmails = event.registeredEmails.filter(email => email !== userEmail);
    await event.save();

    res.json({ message: 'Registration removed successfully' });
  } catch (error) {
    console.error('Error removing registration:', error);
    res.status(500).json({ error: 'Failed to remove registration' });
  }
});
module.exports = router;
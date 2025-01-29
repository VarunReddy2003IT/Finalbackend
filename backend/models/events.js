const mongoose = require('mongoose');

// Define the ClubEvents schema
const clubEventSchema = new mongoose.Schema({
  eventname: { type: String, required: true }, // Changed 'name' to 'eventname' for consistency
  description: { type: String, required: true },
  image: { type: String, default: '' },
  date: { type: Date, required: true }, // Added date field for event scheduling
  type: { type: String, enum: ['upcoming', 'past'], required: true } // 'upcoming' or 'past'
}, { timestamps: true }); // Adds createdAt & updatedAt fields

// Create the ClubEvent model
const ClubEvent = mongoose.model('Events', clubEventSchema, 'Events');

module.exports = ClubEvent;

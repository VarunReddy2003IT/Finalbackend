const mongoose = require('mongoose');

// Define the ClubEvents schema
const clubEventSchema = new mongoose.Schema({
  eventname: { type: String, required: true }, // Name of the event
  clubtype: { type: String, required: true },  // Type of the club (e.g., OpenForge, Tech Club, etc.)
  club: { type: String, required: true },     // Name of the club hosting the event
  image: { type: String, default: '' },        // Optional image for the event
  date: { type: Date, required: true },        // Date of the event
  type: { type: String, enum: ['upcoming', 'past'], required: true } // 'upcoming' or 'past'
}, { timestamps: true }); // Adds createdAt & updatedAt fields

// Create the ClubEvent model
const ClubEvent = mongoose.model('Events', clubEventSchema, 'Events');

module.exports = ClubEvent;

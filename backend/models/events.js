const mongoose = require('mongoose');

// Define the ClubEvents schema
const clubEventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, default: '' },
  type: { type: String, enum: ['upcoming', 'past'], required: true } // 'upcoming' or 'past'
});

// Create the ClubEvent model
const ClubEvent = mongoose.model('ClubEvent', clubEventSchema,'Events');

module.exports = ClubEvent;

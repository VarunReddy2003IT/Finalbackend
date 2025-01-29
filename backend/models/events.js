const mongoose = require('mongoose');

// Define the ClubEvents schema
const clubEventSchema = new mongoose.Schema({
  eventname: { type: String, required: true }, // 'name' changed to 'eventname' for consistency
  description: { type: String, required: true },
  image: { type: String, default: '' },
  date: { type: Date, required: true }, // Event date field
  type: { type: String, enum: ['upcoming', 'past'], required: true } // 'upcoming' or 'past'
}, { timestamps: true }); // Add createdAt and updatedAt fields

// Pre-save hook to dynamically set the 'type' based on the date
clubEventSchema.pre('save', function(next) {
  // Determine if the event is upcoming or past
  this.type = new Date(this.date) > new Date() ? 'upcoming' : 'past';
  next();
});

// Create the ClubEvent model
const ClubEvent = mongoose.model('Events', clubEventSchema, 'Events');

module.exports = ClubEvent;

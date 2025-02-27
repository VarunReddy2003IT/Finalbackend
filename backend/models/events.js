const mongoose = require('mongoose');

const clubEventSchema = new mongoose.Schema({
  eventname: {
    type: String,
    required: true
  },
  clubtype: {
    type: String,
    required: true,
    enum: ['Technical', 'Social', 'Cultural']
  },
  club: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['upcoming', 'past'],
    default: function() {
      const today = new Date();
      return this.date >= today ? 'upcoming' : 'past';
    }
  },
  registeredEmails: [{
    type: String
  }],
  participatedEmails: [{
    type: String
  }],
  documentUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Pre-save middleware to update the type based on the date
clubEventSchema.pre('save', function(next) {
  const today = new Date();
  this.type = this.date >= today ? 'upcoming' : 'past';
  next();
});

const ClubEvent = mongoose.model('Events', clubEventSchema, 'Events');
module.exports = ClubEvent;
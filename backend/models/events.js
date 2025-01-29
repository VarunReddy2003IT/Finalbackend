const mongoose = require('mongoose');

const clubEventSchema = new mongoose.Schema({
  eventname: { 
    type: String, 
    required: true 
  },
  clubtype: { 
    type: String, 
    required: true 
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
    required: true 
  },
  registrationLink: {
    type: String,
    required: function() {
      return this.type === 'upcoming';
    }
  }
}, { 
  timestamps: true 
});

const ClubEvent = mongoose.model('Events', clubEventSchema, 'Events');

module.exports = ClubEvent;
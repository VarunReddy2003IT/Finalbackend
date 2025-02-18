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
  paymentRequired: {
    type: Boolean,
    default: false
  },
  paymentLink: {
    type: String,
    required: function() {
      // Required only if payment is required and it's an upcoming event
      const isUpcoming = this.date >= new Date();
      return this.paymentRequired && isUpcoming;
    }
  }
}, {
  timestamps: true
});

const ClubEvent = mongoose.model('Events', clubEventSchema, 'Events');
module.exports = ClubEvent;
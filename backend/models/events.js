const mongoose = require('mongoose');

const clubEventSchema = new mongoose.Schema({
  eventname: { type: String, required: true },
  clubtype: { type: String, required: true },
  club: { type: String, required: true },
  image: { type: String, default: '' },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  paymentRequired: { type: Boolean, default: false },
  paymentQR: { type: String, required: function() {
    const isUpcoming = this.date >= new Date();
    return this.paymentRequired && isUpcoming;
  }},
  registeredEmails: [{ type: String }],
  participatedEmails: [{ type: String, default: [] }], // Track who participated
  documentUrl: { type: String, default: '' }
}, {
  timestamps: true 
});

const ClubEvent = mongoose.model('Events', clubEventSchema, 'Events');
module.exports = ClubEvent;
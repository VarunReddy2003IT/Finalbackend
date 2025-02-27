const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeId: { type: String, required: true },
  email: { type: String, required: true },
  mobilenumber: { type: String},
  password: { type: String, required: true },
  club: { type: String, required: true },
  imageUrl: { type: String, default: null },
  pendingClubs: { type: [String], default: [] },
  selectedClubs: { type: [String], default: [] },
  location: { type: String },
  participatedevents: { type: [String], default: [] } // Fixed typo: typr -> type
});

module.exports = mongoose.model('Lead', leadSchema, 'Lead');
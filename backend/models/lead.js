const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeId: { type: String, required: true },
  email: { type: String, required: true },
  mobilenumber: { type: String},
  password: { type: String, required: true },
  club: { type: String, required: true } ,// Changed from 'team' to 'club' to match frontend
  imageUrl: { type: String, default: null },
  pendingClubs: { type: [String], default: [] },
  selectedClubs: { type: [String], default: [] },
  location:{type: String},
  participatedevents:{typr:[String],default:[]}
});

module.exports = mongoose.model('Lead', leadSchema, 'Lead');
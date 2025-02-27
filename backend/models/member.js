const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeId: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobilenumber: { type: String },
  password: { type: String, required: true },
  pendingClubs: { type: [String], default: [] },
  selectedClubs: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  imageUrl: { type: String, default: null },
  location: { type: String, default: null },
  participatedevents: { type: [String], default: [] } // Fixed typo: typr -> type
});

module.exports = mongoose.model('Member', memberSchema, 'Member');
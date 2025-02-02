const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeId: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  assignedTasks: { type: [String], default: [] },
  selectedClubs: { type: [String], default: [] }, // Added field for selected clubs
  createdAt: { type: Date, default: Date.now },
  imageUrl: { type: String, default: null }
});

module.exports = mongoose.model('Member', memberSchema, 'Member');

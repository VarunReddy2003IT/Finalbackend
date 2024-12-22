const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeId: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  team: { type: String, required: true, default: 'No Team Assigned' }, // Default value
});

module.exports = mongoose.model('Lead', leadSchema,'Lead');

const mongoose = require('mongoose');

const signupRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeId: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  club: { type: String, required: function() { return this.role === 'lead'; } } // Required only for leads
});

module.exports = mongoose.model('SignupRequest', signupRequestSchema);
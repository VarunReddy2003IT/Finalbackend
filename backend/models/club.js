const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['Cultural', 'Technical', 'Sports', 'Other'],
    required: true
  },
  logo: {
    type: String
  },
  description: {
    type: String
  },
  labels: [{
    name: String,
    value: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
clubSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Club', clubSchema);
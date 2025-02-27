const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeId: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobilenumber: { type: String},
  password: { type: String, required: true },
  permissions: { type: [String], default: ['manage-users', 'view-reports', 'configure-system'] }, // Array of permissions
  createdAt: { type: Date, default: Date.now }, // Timestamp for account creation
  imageUrl: { type: String, default: null },
  location:{type: String}
});

module.exports = mongoose.model('Admin', adminSchema,'Admin');

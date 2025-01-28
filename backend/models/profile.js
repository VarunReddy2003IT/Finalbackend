const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: 'Admin'
  },
  password: String,
  role: {
    type: String,
    default: 'admin'
  },
  avatar: {
    type: String
  }
});

const leadSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: 'Lead'
  },
  password: String,
  role: {
    type: String,
    default: 'lead'
  },
  club: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  }
});

const memberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: 'Member'
  },
  password: String,
  role: {
    type: String,
    default: 'member'
  },
  avatar: {
    type: String
  }
});

const Admin = mongoose.model('Admin', adminSchema);
const Lead = mongoose.model('Lead', leadSchema);
const Member = mongoose.model('Member', memberSchema);

module.exports = { Admin, Lead, Member };
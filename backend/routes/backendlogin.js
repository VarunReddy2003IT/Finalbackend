const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password, role, club } = req.body;

  // Check if all required fields are provided
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Determine the user model based on the role
  let userModel;
  if (role === 'admin') {
    userModel = Admin;
  } else if (role === 'lead') {
    userModel = Lead;
  } else if (role === 'member') {
    userModel = Member;
  } else {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    // Fetch user based on role
    let user;
    if (role === 'lead') {
      // Leads must match both email and club
      if (!club) {
        return res.status(400).json({ message: 'Club is required for lead role' });
      }
      user = await userModel.findOne({ email, club });
    } else {
      // Admin and member only match email
      user = await userModel.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the password matches
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Return successful login response
    res.status(200).json({
      message: 'Login successful',
      user: {
        name: user.name,
        email: user.email,
        role: role,
        ...(role === 'lead' && { club: user.club }), // Include club for leads
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Error during login', error: err });
  }
});

module.exports = router;

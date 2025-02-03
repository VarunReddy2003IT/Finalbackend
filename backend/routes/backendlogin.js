const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password, role, club } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

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
    let user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (role === 'lead') {
      if (!club) {
        return res.status(400).json({ message: 'Club is required for lead role' });
      }

      // Ensure the lead's selected club list is updated
      if (!user.selectedClubs.includes(club)) {
        user.selectedClubs.push(club);
        await user.save();
      }
    }

    res.status(200).json({
      message: 'Login successful',
      user: {
        name: user.name,
        email: user.email,
        role: role,
        imageUrl: user.imageUrl,
        ...(role === 'lead' && {
          collegeId: user.collegeId,
          selectedClubs: user.selectedClubs,
          pendingClubs: user.pendingClubs
        }),
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Error during login', error: err });
  }
});

module.exports = router;

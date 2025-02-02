const express = require('express');
const router = express.Router();
const Member = require('../models/member');
const Lead = require('../models/lead');
const nodemailer = require('nodemailer');

// Nodemailer setup (using the same configuration as signup.js)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'varunreddy2new@gmail.com',
    pass: 'bmly geoo gwkg jasu',
  },
});

// Route to handle club selection
router.post('/select-clubs', async (req, res) => {
  try {
    const { email, selectedClub } = req.body;

    // Find the member and update their selected clubs
    const member = await Member.findOne({ email });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Add the new club if it's not already selected
    if (!member.selectedClubs.includes(selectedClub)) {
      member.selectedClubs.push(selectedClub);
      await member.save();

      // Find all leads for the selected club
      const clubLeads = await Lead.find({ club: selectedClub });
      const leadEmails = clubLeads.map(lead => lead.email);

      if (leadEmails.length === 0) {
        return res.status(200).json({
          message: 'Club selected successfully, but no club leads found to notify'
        });
      }

      // Send email to club leads
      const mailOptions = {
        from: 'varunreddy2new@gmail.com',
        to: leadEmails,
        subject: `New Member Interest in ${selectedClub}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Member Interest</h2>
            <p><strong>Member Name:</strong> ${member.name}</p>
            <p><strong>Email:</strong> ${member.email}</p>
            <p><strong>College ID:</strong> ${member.collegeId}</p>
            <p>This member has expressed interest in joining ${selectedClub}.</p>
            <div style="margin-top: 20px;">
              <p>You can contact them directly at ${member.email} to proceed with the membership process.</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({
        message: 'Club selected successfully and leads have been notified'
      });
    } else {
      res.status(400).json({
        message: 'You have already selected this club'
      });
    }
  } catch (error) {
    console.error('Club selection error:', error);
    res.status(500).json({
      message: 'An error occurred while processing your request'
    });
  }
});

// Route to get member's selected clubs
router.get('/selected-clubs/:email', async (req, res) => {
  try {
    const member = await Member.findOne({ email: req.params.email });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.status(200).json({ selectedClubs: member.selectedClubs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching selected clubs' });
  }
});

module.exports = router;
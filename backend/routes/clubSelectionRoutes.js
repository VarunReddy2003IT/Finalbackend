const express = require('express');
const router = express.Router();
const Member = require('../models/member');
const Lead = require('../models/lead');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'varunreddy2new@gmail.com',
    pass: 'bmly geoo gwkg jasu',
  },
});

// Helper function to generate approval token
const generateApprovalToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Store pending approvals temporarily (in production, use a database)
const pendingApprovals = new Map();

// Route to handle club selection request
router.post('/select-clubs', async (req, res) => {
  try {
    const { email, selectedClub } = req.body;

    // Input validation
    if (!email || !selectedClub) {
      return res.status(400).json({
        success: false,
        message: 'Email and club selection are required'
      });
    }

    // Find the member and validate
    const member = await Member.findOne({ email });
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check if club is already selected
    if (member.selectedClubs && member.selectedClubs.includes(selectedClub)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this club'
      });
    }

    // Check if club is already pending
    if (member.pendingClubs && member.pendingClubs.includes(selectedClub)) {
      return res.status(400).json({
        success: false,
        message: 'Your request for this club is already pending'
      });
    }

    // Add to pending clubs if not already present
    if (!member.pendingClubs) {
      member.pendingClubs = [];
    }
    member.pendingClubs.push(selectedClub);
    await member.save();

    // Find all leads for the selected club
    const clubLeads = await Lead.find({ club: selectedClub });
    const leadEmails = clubLeads.map(lead => lead.email);

    if (leadEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Request submitted, but no club leads found to notify'
      });
    }

    // Generate approval token and store request details
    const approvalToken = generateApprovalToken();
    pendingApprovals.set(approvalToken, {
      memberEmail: email,
      club: selectedClub,
      timestamp: new Date()
    });

    // Clean up old tokens (optional)
    const APPROVAL_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
    for (const [token, data] of pendingApprovals.entries()) {
      if (Date.now() - data.timestamp > APPROVAL_EXPIRY) {
        pendingApprovals.delete(token);
      }
    }

    // Send email to club leads
    const mailOptions = {
      from: 'varunreddy2new@gmail.com',
      to: leadEmails,
      subject: `New Member Request for ${selectedClub}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">
            New Member Request
          </h2>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #34495e; margin-bottom: 15px;">Member Details:</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${member.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${member.email}</p>
            <p style="margin: 5px 0;"><strong>College ID:</strong> ${member.collegeId}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; margin-bottom: 20px;">
              This member has requested to join <strong>${selectedClub}</strong>.
            </p>
            
            <div style="margin: 20px 0;">
              <a href="https://finalbackend-8.onrender.com/api/club-selection/approve/${approvalToken}/true" 
                style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block;">
                Approve
              </a>
              
              <a href="https://finalbackend-8.onrender.com/api/club-selection/approve/${approvalToken}/false" 
                style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block;">
                Reject
              </a>
            </div>
          </div>
          
          <p style="color: #666; font-size: 0.9em; text-align: center; margin-top: 20px;">
            You can also contact the member directly at ${member.email} if you need additional information.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Club request submitted successfully and leads have been notified'
    });

  } catch (error) {
    console.error('Club selection error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request'
    });
  }
});

// Route to handle approval/rejection via email links
router.get('/approve/:token/:approved', async (req, res) => {
    try {
      const { token, approved } = req.params;
      const isApproved = approved === 'true';
  
      // Validate token
      if (!pendingApprovals.has(token)) {
        return res.status(404).send('Invalid or expired approval link');
      }
  
      const { memberEmail, club } = pendingApprovals.get(token);
      pendingApprovals.delete(token); // Remove token to prevent reuse
  
      // Find the member
      const member = await Member.findOne({ email: memberEmail });
      if (!member) {
        return res.status(404).send('Member not found');
      }
  
      // Remove from pending clubs
      member.pendingClubs = member.pendingClubs.filter(c => c !== club);
  
      if (isApproved) {
        if (!member.selectedClubs) {
          member.selectedClubs = [];
        }
        member.selectedClubs.push(club);
  
        // Send approval email
        await transporter.sendMail({
          from: 'varunreddy2new@gmail.com',
          to: memberEmail,
          subject: `Welcome to ${club}!`,
          text: `Congratulations! You have been approved to join ${club}.`
        });
  
      } else {
        // Send rejection email
        await transporter.sendMail({
          from: 'varunreddy2new@gmail.com',
          to: memberEmail,
          subject: `Update on ${club} Club Request`,
          text: `Sorry, your request to join ${club} was not approved.`
        });
      }
  
      await member.save(); // Ensure database is updated
  
      res.send(`<h1>${isApproved ? 'Request Approved' : 'Request Rejected'}</h1><p>The member has been notified.</p>`);
  
    } catch (error) {
      console.error('Approval handling error:', error);
      res.status(500).send('An error occurred while processing the approval');
    }
  });
  

// Route to get member's clubs (both selected and pending)
router.get('/selected-clubs/:email', async (req, res) => {
  try {
    const member = await Member.findOne({ email: req.params.email });
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.status(200).json({
      success: true,
      selectedClubs: member.selectedClubs || [],
      pendingClubs: member.pendingClubs || []
    });

  } catch (error) {
    console.error('Error fetching clubs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching selected clubs'
    });
  }
});

module.exports = router;
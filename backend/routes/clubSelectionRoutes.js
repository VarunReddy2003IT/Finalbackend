const express = require('express');
const router = express.Router();
const Member = require('../models/member');
const Lead = require('../models/lead');
const Admin = require('../models/admin');
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

// Route to handle club selection request for both members and leads
router.post('/select-clubs', async (req, res) => {
  try {
    const { email, role, selectedClub } = req.body;

    // Input validation
    if (!email || !selectedClub || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, role, and club selection are required'
      });
    }

    // Find the user based on role
    let user;
    if (role === 'member') {
      user = await Member.findOne({ email });
    } else if (role === 'lead') {
      user = await Lead.findOne({ email });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if club is already selected
    if (user.selectedClubs && user.selectedClubs.includes(selectedClub)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this club'
      });
    }

    // Check if club is already pending
    if (user.pendingClubs && user.pendingClubs.includes(selectedClub)) {
      return res.status(400).json({
        success: false,
        message: 'Your request for this club is already pending'
      });
    }

    // Add to pending clubs
    if (!user.pendingClubs) {
      user.pendingClubs = [];
    }
    user.pendingClubs.push(selectedClub);
    await user.save();

    // Find admins to notify
    const admins = await Admin.find({});
    const adminEmails = admins.map(admin => admin.email);

    if (adminEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Request submitted, but no admins found to notify'
      });
    }

    // Generate approval token
    const approvalToken = generateApprovalToken();
    pendingApprovals.set(approvalToken, {
      email,
      role,
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

    // Send email to admins
    const mailOptions = {
      from: 'varunreddy2new@gmail.com',
      to: adminEmails,
      subject: `New member Request for ${selectedClub}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">
            New member Request
          </h2>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #34495e; margin-bottom: 15px;">User Details:</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${user.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
            ${role === 'member' ? `<p style="margin: 5px 0;"><strong>College ID:</strong> ${user.collegeId}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; margin-bottom: 20px;">
              This user has requested to join <strong>${selectedClub}</strong> as a ${role}.
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
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Club request submitted successfully and admins have been notified'
    });

  } catch (error) {
    console.error('Club selection error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request'
    });
  }
});

// Route to handle approval/rejection
router.get('/approve/:token/:approved', async (req, res) => {
  try {
    const { token, approved } = req.params;
    const isApproved = approved === 'true';

    if (!pendingApprovals.has(token)) {
      return res.status(404).send('Invalid or expired approval link');
    }

    const { email, role, club } = pendingApprovals.get(token);
    pendingApprovals.delete(token);

    // Find user based on role
    let user;
    if (role === 'member') {
      user = await Member.findOne({ email });
    } else if (role === 'lead') {
      user = await Lead.findOne({ email });
    }

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Remove from pending clubs
    user.pendingClubs = user.pendingClubs.filter(c => c !== club);

    if (isApproved) {
      // Initialize selectedClubs array if it doesn't exist
      if (!user.selectedClubs) {
        user.selectedClubs = [];
      }
      user.selectedClubs.push(club);

      // Send approval email
      await transporter.sendMail({
        from: 'varunreddy2new@gmail.com',
        to: email,
        subject: `${club} Club Request Approved!`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
            <h2 style="color: #2c3e50; text-align: center;">Congratulations!</h2>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p>Your request to join <strong>${club}</strong> as a ${role} has been approved.</p>
              ${role === 'lead' ? 
                '<p>You now have access to lead features for this club.</p>' : 
                '<p>You can now participate in club activities and access club resources.</p>'
              }
            </div>
          </div>
        `
      });

    } else {
      // Send rejection email
      await transporter.sendMail({
        from: 'varunreddy2new@gmail.com',
        to: email,
        subject: `Update on ${club} Club Request`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
            <h2 style="color: #2c3e50; text-align: center;">Club Request Update</h2>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p>We regret to inform you that your request to join <strong>${club}</strong> as a ${role} was not approved at this time.</p>
              <p>You may apply again in the future or consider joining other clubs.</p>
            </div>
          </div>
        `
      });
    }

    await user.save();

    // Send response HTML
    res.send(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
        <h1 style="color: ${isApproved ? '#28a745' : '#dc3545'}">
          Request ${isApproved ? 'Approved' : 'Rejected'}
        </h1>
        <p>The user has been notified via email.</p>
        <p style="margin-top: 20px;">You can close this window now.</p>
      </div>
    `);

  } catch (error) {
    console.error('Approval handling error:', error);
    res.status(500).send('An error occurred while processing the approval');
  }
});

// Route to get user's clubs (both selected and pending)
router.get('/selected-clubs/:email/:role', async (req, res) => {
  try {
    const { email, role } = req.params;

    // Find user based on role
    let user;
    if (role === 'member') {
      user = await Member.findOne({ email });
    } else if (role === 'lead') {
      user = await Lead.findOne({ email });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      selectedClubs: user.selectedClubs || [],
      pendingClubs: user.pendingClubs || []
    });

  } catch (error) {
    console.error('Error fetching clubs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clubs information'
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Member = require('../models/member');
const Lead = require('../models/lead');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'varunreddy2new@gmail.com',
    pass: 'bmly geoo gwkg jasu'
  }
});

// Store pending approvals in memory (consider using Redis in production)
const pendingApprovals = new Map();

// Generate secure token for approval links
const generateApprovalToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Cleanup old pending approvals (run periodically)
const cleanupPendingApprovals = () => {
  const EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();
  
  for (const [token, data] of pendingApprovals.entries()) {
    if (now - data.timestamp > EXPIRY_TIME) {
      pendingApprovals.delete(token);
    }
  }
};

// Run cleanup every 24 hours
setInterval(cleanupPendingApprovals, 24 * 60 * 60 * 1000);

// Route to handle club selection requests
router.post('/select-clubs', async (req, res) => {
  try {
    const { email, role, selectedClub } = req.body;

    // Input validation
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    if (!role || !['member', 'lead'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role (member or lead) is required'
      });
    }

    if (!selectedClub || typeof selectedClub !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid club selection is required'
      });
    }

    // Find user based on role
    let user;
    try {
      if (role === 'member') {
        user = await Member.findOne({ email }).exec();
      } else {
        user = await Lead.findOne({ email }).exec();
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `${role} not found with email ${email}`
        });
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Error finding user in database'
      });
    }

    // Initialize arrays if they don't exist
    user.selectedClubs = user.selectedClubs || [];
    user.pendingClubs = user.pendingClubs || [];

    // Check for existing memberships
    if (user.selectedClubs.includes(selectedClub)) {
      return res.status(400).json({
        success: false,
        message: 'Already a member of this club'
      });
    }

    if (user.pendingClubs.includes(selectedClub)) {
      return res.status(400).json({
        success: false,
        message: 'Request already pending for this club'
      });
    }

    // Add to pending clubs
    try {
      user.pendingClubs.push(selectedClub);
      await user.save();
    } catch (saveError) {
      console.error('Save error:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Error saving club request'
      });
    }

    // Find club leads
    let clubLeads;
    try {
      clubLeads = await Lead.find({ club: selectedClub }).exec();
    } catch (leadsError) {
      console.error('Error finding club leads:', leadsError);
      clubLeads = [];
    }

    const leadEmails = clubLeads.map(lead => lead.email);

    // Generate approval token and save request
    const approvalToken = generateApprovalToken();
    pendingApprovals.set(approvalToken, {
      email,
      role,
      club: selectedClub,
      timestamp: Date.now()
    });

    // Send email to club leads if any exist
    if (leadEmails.length > 0) {
      try {
        await transporter.sendMail({
          from: 'varunreddy2new@gmail.com',
          to: leadEmails,
          subject: `New ${role} Request for ${selectedClub}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
              <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                New ${role} Request
              </h2>
              
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="color: #34495e; margin-bottom: 15px;">User Details:</h3>
                <p style="margin: 5px 0;"><strong>Name:</strong> ${user.name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                ${role === 'member' ? `<p style="margin: 5px 0;"><strong>College ID:</strong> ${user.collegeId}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #666; margin-bottom: 20px;">
                  This user has requested to join <strong>${selectedClub}</strong>.
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
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the request, but log the error
      }
    }

    return res.status(200).json({
      success: true,
      message: leadEmails.length > 0 
        ? 'Club request submitted successfully and club leads have been notified'
        : 'Club request submitted successfully, but no club leads are currently available'
    });

  } catch (error) {
    console.error('Club selection error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while processing your request'
    });
  }
});

// Route to handle approval/rejection
router.get('/approve/:token/:approved', async (req, res) => {
  try {
    const { token, approved } = req.params;
    const isApproved = approved === 'true';

    // Check if token exists
    if (!pendingApprovals.has(token)) {
      return res.status(404).send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
          <h1 style="color: #dc3545">Invalid or Expired Link</h1>
          <p>This approval link is no longer valid. The request may have been already processed or expired.</p>
        </div>
      `);
    }

    const { email, role, club } = pendingApprovals.get(token);
    pendingApprovals.delete(token);

    // Find user
    let user;
    try {
      if (role === 'member') {
        user = await Member.findOne({ email }).exec();
      } else {
        user = await Lead.findOne({ email }).exec();
      }

      if (!user) {
        throw new Error('User not found');
      }
    } catch (error) {
      return res.status(404).send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
          <h1 style="color: #dc3545">User Not Found</h1>
          <p>The user associated with this request could not be found.</p>
        </div>
      `);
    }

    // Remove from pending clubs
    user.pendingClubs = user.pendingClubs.filter(c => c !== club);

    if (isApproved) {
      // Add to selected clubs
      if (!user.selectedClubs) {
        user.selectedClubs = [];
      }
      user.selectedClubs.push(club);

      // Send approval email
      try {
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
      } catch (emailError) {
        console.error('Approval email error:', emailError);
      }
    } else {
      // Send rejection email
      try {
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
      } catch (emailError) {
        console.error('Rejection email error:', emailError);
      }
    }

    // Save user changes
    try {
      await user.save();
    } catch (saveError) {
      console.error('Error saving user changes:', saveError);
      return res.status(500).send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
          <h1 style="color: #dc3545">Error</h1>
          <p>An error occurred while processing the request. Please try again.</p>
        </div>
      `);
    }

    // Send success response
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
    res.status(500).send(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
        <h1 style="color: #dc3545">Error</h1>
        <p>An unexpected error occurred while processing the request.</p>
      </div>
    `);
  }
});

// Route to get user's clubs
router.get('/selected-clubs/:email/:role', async (req, res) => {
  try {
    const { email, role } = req.params;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    // Find user based on role
    let user;
    try {
      if (role === 'member') {
        user = await Member.findOne({ email }).exec();
      } else if (role === 'lead') {
        user = await Lead.findOne({ email }).exec();
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Error querying database'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      selectedClubs: user.selectedClubs || [],
      pendingClubs: user.pendingClubs || []
    });

  } catch (error) {
    console.error('Error fetching clubs:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while fetching clubs information'
    });
  }
});

module.exports = router;
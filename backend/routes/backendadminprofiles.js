const router = require('express').Router();
const Lead = require('../models/lead');
const Member = require('../models/member');

// Select clubs route - handles both members and leads
router.post('/select-clubs', async (req, res) => {
  const { email, selectedClub } = req.body;

  try {
    // Check if user exists in either Lead or Member collection
    let user = await Lead.findOne({ email: email.toLowerCase() });
    let isLead = true;

    if (!user) {
      user = await Member.findOne({ email: email.toLowerCase() });
      isLead = false;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize pendingClubs array if it doesn't exist
    if (!user.pendingClubs) {
      user.pendingClubs = [];
    }

    // Prevent duplicate pending requests
    if (user.pendingClubs.includes(selectedClub)) {
      return res.status(400).json({
        success: false,
        message: 'Club request already pending'
      });
    }

    // For leads, check if the selected club is their lead club
    if (isLead && user.club === selectedClub) {
      return res.status(400).json({
        success: false,
        message: 'You are already leading this club'
      });
    }

    // Add to pending clubs
    user.pendingClubs.push(selectedClub);
    await user.save();

    return res.json({
      success: true,
      message: 'Club request sent successfully'
    });
  } catch (error) {
    console.error('Error in club selection:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing club selection'
    });
  }
});

// Get selected clubs route - handles both members and leads
router.get('/selected-clubs/:email', async (req, res) => {
  const { email } = req.params;

  try {
    // Check both Lead and Member collections
    const lead = await Lead.findOne({ email: email.toLowerCase() });
    const member = await Member.findOne({ email: email.toLowerCase() });

    let userData = null;
    if (lead) {
      userData = {
        selectedClubs: lead.selectedClubs || [],
        pendingClubs: lead.pendingClubs || [],
        leadClub: lead.club // The club they're leading
      };
    } else if (member) {
      userData = {
        selectedClubs: member.selectedClubs || [],
        pendingClubs: member.pendingClubs || []
      };
    }

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      ...userData
    });
  } catch (error) {
    console.error('Error fetching selected clubs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching selected clubs'
    });
  }
});

// Approve club request route
router.post('/approve-club', async (req, res) => {
  const { email, club } = req.body;

  try {
    // Check both Lead and Member collections
    let user = await Lead.findOne({ email: email.toLowerCase() });
    let isLead = true;

    if (!user) {
      user = await Member.findOne({ email: email.toLowerCase() });
      isLead = false;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize arrays if they don't exist
    if (!user.selectedClubs) user.selectedClubs = [];
    if (!user.pendingClubs) user.pendingClubs = [];

    // Check if club is in pending requests
    if (!user.pendingClubs.includes(club)) {
      return res.status(400).json({
        success: false,
        message: 'No pending request found for this club'
      });
    }

    // Move club from pending to selected
    user.pendingClubs = user.pendingClubs.filter(c => c !== club);
    user.selectedClubs.push(club);
    await user.save();

    return res.json({
      success: true,
      message: 'Club request approved successfully'
    });
  } catch (error) {
    console.error('Error approving club request:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving club request'
    });
  }
});

// Reject club request route
router.post('/reject-club', async (req, res) => {
  const { email, club } = req.body;

  try {
    // Check both Lead and Member collections
    let user = await Lead.findOne({ email: email.toLowerCase() });
    let isLead = true;

    if (!user) {
      user = await Member.findOne({ email: email.toLowerCase() });
      isLead = false;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove from pending clubs
    if (user.pendingClubs) {
      user.pendingClubs = user.pendingClubs.filter(c => c !== club);
      await user.save();
    }

    return res.json({
      success: true,
      message: 'Club request rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting club request:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting club request'
    });
  }
});

module.exports = router;
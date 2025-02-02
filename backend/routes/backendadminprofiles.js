// routes/admin.js
const router = require('express').Router();
const Lead = require('../models/lead');
const Member = require('../models/member');

// Middleware to handle async errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Response helper
const sendResponse = (res, statusCode, success, data = null, message = null) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

// Get all members with optional filtering
router.get('/all-members', asyncHandler(async (req, res) => {
  const { club, status } = req.query;
  const query = {};
  
  if (club) query.club = club;
  if (status) query.status = status;
  
  const members = await Member.find(query)
    .select('-password')  // Exclude sensitive data
    .sort({ createdAt: -1 });
  
  return sendResponse(res, 200, true, members);
}));

// Get members by club
router.get('/members-by-club', asyncHandler(async (req, res) => {
  const { clubName } = req.query;
  
  if (!clubName) {
    return sendResponse(res, 400, false, null, 'Club name is required');
  }
  
  const members = await Member.find({ club: clubName })
    .select('-password')
    .sort({ name: 1 });
  
  return sendResponse(res, 200, true, members);
}));

// Get all leads with optional filtering
router.get('/all-leads', asyncHandler(async (req, res) => {
  const { club, status } = req.query;
  const query = {};
  
  if (club) query.club = club;
  if (status) query.status = status;
  
  const leads = await Lead.find(query)
    .select('-password')
    .sort({ createdAt: -1 });
  
  return sendResponse(res, 200, true, leads);
}));

// Delete user (member or lead)
router.delete('/delete-user', asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  // Input validation
  if (!email || !role) {
    return sendResponse(res, 400, false, null, 'Email and role are required');
  }

  if (!['member', 'lead'].includes(role.toLowerCase())) {
    return sendResponse(res, 400, false, null, 'Invalid role specified');
  }

  const normalizedEmail = email.toLowerCase();
  let deletedUser;

  // Delete user based on role
  if (role === 'member') {
    deletedUser = await Member.findOneAndDelete({ email: normalizedEmail });
  } else {
    deletedUser = await Lead.findOneAndDelete({ email: normalizedEmail });
  }

  if (!deletedUser) {
    return sendResponse(res, 404, false, null, `${role} not found`);
  }

  return sendResponse(res, 200, true, null, `${role} deleted successfully`);
}));

// Update user status
router.patch('/update-user-status', asyncHandler(async (req, res) => {
  const { email, role, status } = req.body;

  if (!email || !role || !status) {
    return sendResponse(res, 400, false, null, 'Email, role, and status are required');
  }

  const Model = role.toLowerCase() === 'member' ? Member : Lead;
  const normalizedEmail = email.toLowerCase();

  const updatedUser = await Model.findOneAndUpdate(
    { email: normalizedEmail },
    { status },
    { new: true }
  ).select('-password');

  if (!updatedUser) {
    return sendResponse(res, 404, false, null, `${role} not found`);
  }

  return sendResponse(res, 200, true, updatedUser);
}));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route Error:', err);
  return sendResponse(res, 500, false, null, 'Internal server error');
});

module.exports = router;
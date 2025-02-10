const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');
const SignupRequest = require('../models/signuprequest');
const nodemailer = require('nodemailer');

const router = express.Router();

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'varunreddy2new@gmail.com',
    pass: 'bmly geoo gwkg jasu',
  },
});

// List of valid clubs
const clubs = [
  'YES','NSS1','NSS2','YouthForSeva','YFS','WeAreForHelp','HOH','Vidyadaan','Rotract',
  'GCCC','IEEE','CSI','AlgoRhythm','OpenForge','VLSID','SEEE','Sports'
];

// In-memory OTP store with Map
const otpStore = new Map();

// Helper function to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to validate email format
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gvpce\.ac\.in$/;
  return emailRegex.test(email);
};

// Helper function to validate mobile number
const validateMobileNumber = (mobileNumber) => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobileNumber);
};

// Helper function to validate password strength
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  return passwordRegex.test(password);
};

// Helper function to check for existing user
const checkExistingUser = async (email, mobileNumber) => {
  const existingRequest = await SignupRequest.findOne({ email });
  const existingAdmin = await Admin.findOne({ email });
  const existingLead = await Lead.findOne({ email });
  const existingMember = await Member.findOne({ email });
  
  return existingRequest || existingAdmin || existingLead || existingMember;
};

// Route to send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        message: 'Please use a valid GVPCE email address' 
      });
    }

    // Check for existing user
    const existingUser = await checkExistingUser(email);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account or signup request with this email already exists' 
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    otpStore.set(email, {
      otp,
      expiry: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
      attempts: 0
    });

    // Send OTP email
    const mailOptions = {
      from: 'varunreddy2new@gmail.com',
      to: email,
      subject: 'GVPCE Club Connect - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Your OTP for GVPCE Club Connect signup is: <strong>${otp}</strong></p>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: 'OTP sent successfully to your email. Valid for 5 minutes.' 
    });
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({ 
      message: 'Error sending OTP. Please try again later.' 
    });
  }
});

// Route to verify OTP and complete signup
router.post('/verify', async (req, res) => {
  try {
    const { name, collegeId, email, mobileNumber, password, role, club, otp } = req.body;

    console.log("Received Data:", req.body); // Debugging log

    // Basic validation
    if ([name, collegeId, email, mobileNumber, password, role, otp].some(field => !field?.trim())) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Please use a valid GVPCE email address' });
    }

    // Validate mobile number
    if (!validateMobileNumber(mobileNumber)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit Indian mobile number' });
    }

    // Validate password strength
    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and contain a number and a special character' });
    }

    // Verify OTP
    const otpData = otpStore.get(email);
    if (!otpData) {
      return res.status(400).json({ message: 'No OTP found. Please request a new OTP.' });
    }

    if (Date.now() > otpData.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    if (otpData.otp !== otp) {
      otpData.attempts += 1;
      if (otpData.attempts >= 3) {
        otpStore.delete(email);
        return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
      }
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // Remove used OTP
    otpStore.delete(email);

    // Validate club for lead role
    if (role === 'lead' && (!club || !clubs.includes(club))) {
      return res.status(400).json({ message: 'Invalid or missing club selection for lead role' });
    }

    // Check for existing user
    const existingUser = await checkExistingUser(email, mobileNumber);
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email or mobile number was created while verifying. Please try with different credentials.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle admin and lead signups
    if (role === 'admin' || role === 'lead') {
      const newRequest = new SignupRequest({
        name,
        collegeId,
        email,
        mobileNumber,
        role,
        password: hashedPassword,
        club: role === 'lead' ? club : undefined
      });

      await newRequest.save();

      // Fetch admin emails
      const admins = await Admin.find({});
      const adminEmails = admins.map(admin => admin.email);

      if (adminEmails.length === 0) {
        return res.status(500).json({ message: 'No admins found in the system to approve your request' });
      }

      // Send email to admins
      await transporter.sendMail({
        from: 'varunreddy2new@gmail.com',
        to: adminEmails,
        subject: `GVPCE Club Connect Signup Request for ${role}`,
        html: `<div><h2>New Signup Request</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Mobile:</strong> ${mobileNumber}</p><p><strong>Role:</strong> ${role}</p>${role === 'lead' ? `<p><strong>Club:</strong> ${club}</p>` : ''}<p><strong>College ID:</strong> ${collegeId}</p><div><a href="https://finalbackend-8.onrender.com/api/signup/approve/${newRequest._id}">Approve</a><a href="https://finalbackend-8.onrender.com/api/signup/reject/${newRequest._id}">Reject</a></div></div>`
      });

      return res.status(200).json({ message: `${role} signup request submitted successfully. Please wait for admin approval.` });
    }

    // Handle member signups
    const newMember = new Member({
      name,
      collegeId,
      email,
      mobileNumber,
      password: hashedPassword
    });

    await newMember.save();

    // Send welcome email
    await transporter.sendMail({
      from: 'varunreddy2new@gmail.com',
      to: email,
      subject: 'Welcome to GVPCE Club Connect!',
      html: `<div><h2>Welcome to GVPCE Club Connect!</h2><p>Dear ${name},</p><p>Your account has been successfully created.</p></div>`
    });

    return res.status(200).json({ message: 'Member account created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'An error occurred during signup. Please try again later.' });
  }
});

// Route to approve a signup request
router.get('/approve/:id', async (req, res) => {
  try {
    const signupRequest = await SignupRequest.findById(req.params.id);

    if (!signupRequest) {
      return res.status(404).json({ message: 'Signup request not found' });
    }

    let user = null;
    const userData = {
      name: signupRequest.name,
      collegeId: signupRequest.collegeId,
      email: signupRequest.email,
      mobileNumber: signupRequest.mobileNumber,
      password: signupRequest.password
    };

    if (signupRequest.role === 'lead') {
      userData.club = signupRequest.club;
    }

    if (signupRequest.role === 'admin') {
      user = await Admin.findOneAndUpdate(
        { email: signupRequest.email },
        { $set: userData },
        { new: true, upsert: true }
      );
    } else if (signupRequest.role === 'lead') {
      user = await Lead.findOneAndUpdate(
        { email: signupRequest.email },
        { $set: userData },
        { new: true, upsert: true }
      );
    }

    // Send approval email
    const approvalEmail = {
      from: 'varunreddy2new@gmail.com',
      to: signupRequest.email,
      subject: 'GVPCE Club Connect - Account Approved!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Account Approved!</h2>
          <p>Dear ${signupRequest.name},</p>
          <p>Your account request has been approved. You can now log in to access the platform.</p>
          <p>Role: ${signupRequest.role}</p>
          ${signupRequest.role === 'lead' ? `<p>Club: ${signupRequest.club}</p>` : ''}
        </div>
      `
    };

    await transporter.sendMail(approvalEmail);
    await SignupRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({ 
      message: `${signupRequest.role} account approved and created successfully` 
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ message: 'Error approving signup request' });
  }
});

// Route to reject a signup request
router.get('/reject/:id', async (req, res) => {
  try {
    const signupRequest = await SignupRequest.findById(req.params.id);

    if (!signupRequest) {
      return res.status(404).json({ message: 'Signup request not found' });
    }

    // Send rejection email
    const rejectionEmail = {
      from: 'varunreddy2new@gmail.com',
      to: signupRequest.email,
      subject: 'GVPCE Club Connect - Account Request Status',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Account Request Update</h2>
          <p>Dear ${signupRequest.name},</p>
          <p>We regret to inform you that your account request has been declined.</p>
          <p>If you believe this was a mistake, please try signing up again or contact support.</p>
        </div>
      `
    };

    await transporter.sendMail(rejectionEmail);
    await SignupRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Signup request rejected successfully' });
  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ message: 'Error rejecting signup request' });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const pendingRequests = await SignupRequest.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.status(200).json(pendingRequests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Error fetching pending requests' });
  }
});

// Route to check if email or mobile exists
router.post('/check-exists', async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;

    const existingUser = await checkExistingUser(email, mobileNumber);
    
    if (existingUser) {
      // Determine which field(s) caused the conflict
      const conflicts = [];
      if (existingUser.email === email) conflicts.push('email');
      if (existingUser.mobileNumber === mobileNumber) conflicts.push('mobile number');
      
      return res.status(400).json({
        exists: true,
        message: `An account with this ${conflicts.join(' and ')} already exists`
      });
    }

    res.status(200).json({
      exists: false,
      message: 'No existing account found with these credentials'
    });
  } catch (error) {
    console.error('Check exists error:', error);
    res.status(500).json({ 
      message: 'Error checking existing credentials' 
    });
  }
});

// Route to resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        message: 'Please use a valid GVPCE email address' 
      });
    }

    // Check if previous OTP exists and has exceeded max resend attempts
    const existingOtp = otpStore.get(email);
    if (existingOtp && existingOtp.resendCount >= 3) {
      return res.status(400).json({ 
        message: 'Maximum OTP resend limit reached. Please try signing up again after some time.' 
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    otpStore.set(email, {
      otp,
      expiry: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
      attempts: 0,
      resendCount: (existingOtp?.resendCount || 0) + 1
    });

    // Send new OTP email
    const mailOptions = {
      from: 'varunreddy2new@gmail.com',
      to: email,
      subject: 'GVPCE Club Connect - New Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>New Email Verification OTP</h2>
          <p>Your new OTP for GVPCE Club Connect signup is: <strong>${otp}</strong></p>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: 'New OTP sent successfully to your email. Valid for 5 minutes.' 
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      message: 'Error resending OTP. Please try again later.' 
    });
  }
});

// Helper function to clean up expired OTPs
const cleanupExpiredOTPs = () => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiry) {
      otpStore.delete(email);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

module.exports = router;
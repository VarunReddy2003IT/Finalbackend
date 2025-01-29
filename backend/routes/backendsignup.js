const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');
const SignupRequest = require('../models/signuprequest');
const nodemailer = require('nodemailer');

const router = express.Router();

// Nodemailer setup for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'varunreddy2new@gmail.com',
    pass: 'bmly geoo gwkg jasu',
  },
});

// List of valid clubs
const clubs = [
  'CFSR','YES','NSS UNIT 1','NSS UNIT 2','YFS(Youth For Seva)','YFS','We Are For Help','Hearts Of Humanity','Vidhyan','Rotract'
  ,'GCCC','IEEE','CSI','AlgoRhythm','OpenForge','VLSID','SEEE','Sports'
];

// Signup route for handling user registration requests
router.post('/', async (req, res) => {
  try {
    const { name, collegeId, email, password, role, club } = req.body;

    // Basic validation for required fields
    if (!name || !collegeId || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gvpce\.ac\.in$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please use a valid GVPCE email address' });
    }

    // Validate club for lead role
    if (role === 'lead') {
      if (!club) {
        return res.status(400).json({ message: 'Club selection is required for lead role' });
      }
      if (!validClubs.includes(club)) {
        return res.status(400).json({ message: 'Invalid club selection' });
      }
    }

    // Check for existing user or pending request
    const existingRequest = await SignupRequest.findOne({ email });
    const existingAdmin = await Admin.findOne({ email });
    const existingLead = await Lead.findOne({ email });
    const existingMember = await Member.findOne({ email });

    if (existingRequest || existingAdmin || existingLead || existingMember) {
      return res.status(400).json({ 
        message: 'An account or signup request with this email already exists' 
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle admin and lead signups
    if (role === 'admin' || role === 'lead') {
      const newRequest = new SignupRequest({
        name,
        collegeId,
        email,
        role,
        password: hashedPassword,
        club: role === 'lead' ? club : undefined
      });

      await newRequest.save();

      // Fetch admin emails
      const admins = await Admin.find({});
      const adminEmails = admins.map(admin => admin.email);

      if (adminEmails.length === 0) {
        return res.status(500).json({ 
          message: 'No admins found in the system to approve your request' 
        });
      }

      // Prepare email content
      const mailOptions = {
        from: 'varunreddy2new@gmail.com',
        to: adminEmails,
        subject: `GVPCE Club Connect Signup Request for ${role}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Signup Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Role:</strong> ${role}</p>
            ${role === 'lead' ? `<p><strong>Club:</strong> ${club}</p>` : ''}
            <p><strong>College ID:</strong> ${collegeId}</p>
            <div style="margin-top: 20px;">
              <a href="https://finalbackend-8.onrender.com/api/signup/approve/${newRequest._id}" 
                 style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; margin-right: 10px; border-radius: 5px;">
                Approve
              </a>
              <a href="https://finalbackend-8.onrender.com/api/signup/reject/${newRequest._id}" 
                 style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Reject
              </a>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ 
        message: `${role} signup request submitted. Please wait for admin approval.` 
      });
    } 
    // Handle member signups
    else if (role === 'member') {
      const newMember = new Member({
        name,
        collegeId,
        email,
        password: hashedPassword
      });

      await newMember.save();

      // Send welcome email to new member
      const welcomeEmail = {
        from: 'varunreddy2new@gmail.com',
        to: email,
        subject: 'Welcome to GVPCE Club Connect!',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to GVPCE Club Connect!</h2>
            <p>Dear ${name},</p>
            <p>Your account has been successfully created. You can now log in to access our platform.</p>
            <p>Your College ID: ${collegeId}</p>
            <p>Thank you for joining!</p>
          </div>
        `
      };

      await transporter.sendMail(welcomeEmail);

      res.status(200).json({ message: 'Member account created successfully' });
    } 
    else {
      return res.status(400).json({ message: 'Invalid role specified' });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'An error occurred during signup. Please try again later.' 
    });
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
      password: signupRequest.password
    };

    // Add club field for lead role
    if (signupRequest.role === 'lead') {
      userData.club = signupRequest.club;
    }

    // Create or update user based on role
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

    // Send approval email to user
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

    // Delete the signup request
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

    // Send rejection email to user
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

    // Delete the request
    await SignupRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Signup request rejected successfully' });
  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ message: 'Error rejecting signup request' });
  }
});

// Route to fetch all pending signup requests
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

module.exports = router;
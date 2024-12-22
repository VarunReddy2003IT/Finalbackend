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
    user: 'varunreddy2new@gmail.com',  // Your Gmail address
    pass: 'bmly geoo gwkg jasu',       // The App Password you generated for Google Account
  },
});

// Signup route for handling user registration requests
router.post('/', async (req, res) => {
  const { name, collegeId, email, password, role } = req.body;

  // Validation for required fields
  if (!name || !collegeId || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if a signup request with the same email already exists
  const existingRequest = await SignupRequest.findOne({ email });
  if (existingRequest) {
    return res.status(400).json({ message: 'A signup request with this email already exists. Please wait for approval.' });
  }

  // Handle case for admin, lead, or member signup requests
  if (role === 'admin' || role === 'lead') {
    // Save signup request for admin or lead
    const newRequest = new SignupRequest({
      name,
      collegeId,
      email,
      role,
      password: hashedPassword,
    });

    try {
      // Save the request in the database
      await newRequest.save();

      // Notify all current admins about the new signup request
      const admins = await Admin.find({});  // Fetch all admin emails
      const adminEmails = admins.map(admin => admin.email);  // Get all admin emails

      // Prepare email options to send to admins for approval
      const mailOptions = {
        from: 'varunreddy2new@gmail.com',  // Sender's email
        to: adminEmails,                   // List of admins to notify
        subject: `GVPCE Club Connect Signup Request for ${role}`,  // Subject line
        html: `        
          <p>Name: ${name} <br> Email: ${email} has requested to sign up as a ${role}.</p>
          <p>Click below to respond:</p>
          <a style="color:yellow;background-color:yellow" href="https://finalbackend-8.onrender.com/api/signup/approve/${newRequest._id}">Approve</a>
          <a style="color:yellow;background-color:yellow" href="https://finalbackend-8.onrender.com/api/signup/reject/${newRequest._id}">Reject</a>
        `,  // Email body with links to approve or reject the signup
      };

      // Send the email to all admins
      await transporter.sendMail(mailOptions);

      // Respond to the client indicating that the request was submitted successfully
      res.status(200).json({ message: `Signup request submitted for ${role}. Please wait for admin approval.` });
    } catch (err) {
      console.error('Error during signup request:', err);
      res.status(500).json({ message: 'Error processing signup request' });
    }
  } else if (role === 'member') {
    // Directly add member to the Member collection if role is 'member'
    const newMember = new Member({
      name,
      collegeId,
      email,
      password: hashedPassword,
    });

    try {
      // Save the new member directly in the Member collection
      await newMember.save();

      // Send a welcome email to the new member
      const mailOptions = {
        from: 'varunreddy2new@gmail.com',
        to: email,
        subject: 'Welcome to the system!',
        html: `<p>Dear ${name},</p><p>Welcome to our platform. Your account has been successfully created.</p>`,
      };

      // Send the email to the new member
      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: 'Member account created successfully' });
    } catch (err) {
      console.error('Error adding member:', err);
      res.status(500).json({ message: 'Error processing member signup' });
    }
  } else {
    return res.status(400).json({ message: 'Invalid role' });
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

    // Create user based on role
    if (signupRequest.role === 'admin') {
      user = new Admin({
        name: signupRequest.name,
        collegeId: signupRequest.collegeId,
        email: signupRequest.email,
        password: signupRequest.password,
      });
    } else if (signupRequest.role === 'lead') {
      user = new Lead({
        name: signupRequest.name,
        collegeId: signupRequest.collegeId,
        email: signupRequest.email,
        password: signupRequest.password,
      });
    } else if (signupRequest.role === 'member') {
      user = new Member({
        name: signupRequest.name,
        collegeId: signupRequest.collegeId,
        email: signupRequest.email,
        password: signupRequest.password,
      });
    }

    // Save the user to the respective model and delete the request
    await user.save();
    await SignupRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: `Signup request for ${signupRequest.role} approved and user added` });
  } catch (err) {
    res.status(500).json({ message: 'Error approving signup request', error: err });
  }
});

// Route to reject a signup request
router.get('/reject/:id', async (req, res) => {
  try {
    const signupRequest = await SignupRequest.findById(req.params.id);

    if (!signupRequest) {
      return res.status(404).json({ message: 'Signup request not found' });
    }

    // Delete the request if it's rejected
    await SignupRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: `Signup request for ${signupRequest.role} rejected` });
  } catch (err) {
    res.status(500).json({ message: 'Error rejecting signup request' });
  }
});

// Route to fetch all pending signup requests (for admins to approve/reject)
router.get('/pending', async (req, res) => {
  try {
    const pendingRequests = await SignupRequest.find();  // You can filter by role if necessary
    res.status(200).json(pendingRequests);
  } catch (err) {
    console.error('Error fetching pending requests:', err);
    res.status(500).json({ message: 'Error fetching pending requests', error: err });
  }
});

module.exports = router;

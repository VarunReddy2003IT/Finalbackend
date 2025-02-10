const express = require('express');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');
const SignupRequest = require('../models/signuprequest');
const nodemailer = require('nodemailer');

const router = express.Router();

// Update your model schema to include mobile number
const userSchema = {
  name: String,
  collegeId: String,
  email: String,
  mobile: String,  // Added mobile field
  password: String,
  role: String,
  club: String
};

// Twilio setup
const twilioClient = twilio(
  'your_twilio_account_sid',
  'your_twilio_auth_token'
);

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

// OTP stores with verification status
const verificationStore = new Map();

// Helper functions
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gvpce\.ac\.in$/;
  return emailRegex.test(email);
};

const validateMobile = (mobile) => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  return passwordRegex.test(password);
};

const checkExistingUser = async (email, mobile) => {
  const queries = [
    SignupRequest.findOne({ $or: [{ email }, { mobile }] }),
    Admin.findOne({ $or: [{ email }, { mobile }] }),
    Lead.findOne({ $or: [{ email }, { mobile }] }),
    Member.findOne({ $or: [{ email }, { mobile }] })
  ];
  
  const results = await Promise.all(queries);
  return results.some(result => result !== null);
};

// Route to initialize verification
router.post('/init-verification', async (req, res) => {
  try {
    const { email, mobile } = req.body;

    // Validate formats
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (!validateMobile(mobile)) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    // Check for existing users
    const existingUser = await checkExistingUser(email, mobile);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this email or mobile already exists' 
      });
    }

    // Generate verification ID and OTPs
    const verificationId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const emailOTP = generateOTP();
    const mobileOTP = generateOTP();

    // Store verification data
    verificationStore.set(verificationId, {
      email,
      mobile,
      emailOTP,
      mobileOTP,
      emailVerified: false,
      mobileVerified: false,
      expiry: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: {
        email: 0,
        mobile: 0
      }
    });

    // Send email OTP
    await transporter.sendMail({
      from: 'varunreddy2new@gmail.com',
      to: email,
      subject: 'GVPCE Club Connect - Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Your email verification OTP is: <strong>${emailOTP}</strong></p>
          <p>This OTP will expire in 10 minutes.</p>
        </div>
      `
    });

    // Send mobile OTP
    await twilioClient.messages.create({
      body: `Your GVPCE Club Connect mobile verification OTP is: ${mobileOTP}. Valid for 10 minutes.`,
      to: `+91${mobile}`,
      from: 'your_twilio_phone_number'
    });

    res.status(200).json({ 
      message: 'Verification OTPs sent successfully',
      verificationId 
    });
  } catch (error) {
    console.error('Verification initialization error:', error);
    res.status(500).json({ message: 'Error sending verification OTPs' });
  }
});

// Route to verify OTPs
router.post('/verify-otp', async (req, res) => {
  try {
    const { verificationId, type, otp } = req.body;

    const verificationData = verificationStore.get(verificationId);
    if (!verificationData) {
      return res.status(400).json({ message: 'Invalid or expired verification session' });
    }

    if (Date.now() > verificationData.expiry) {
      verificationStore.delete(verificationId);
      return res.status(400).json({ message: 'Verification session expired' });
    }

    // Verify OTP based on type
    if (type === 'email') {
      if (verificationData.attempts.email >= 3) {
        return res.status(400).json({ message: 'Too many email verification attempts' });
      }

      if (verificationData.emailOTP !== otp) {
        verificationData.attempts.email += 1;
        return res.status(400).json({ message: 'Invalid email OTP' });
      }

      verificationData.emailVerified = true;
    } else if (type === 'mobile') {
      if (verificationData.attempts.mobile >= 3) {
        return res.status(400).json({ message: 'Too many mobile verification attempts' });
      }

      if (verificationData.mobileOTP !== otp) {
        verificationData.attempts.mobile += 1;
        return res.status(400).json({ message: 'Invalid mobile OTP' });
      }

      verificationData.mobileVerified = true;
    } else {
      return res.status(400).json({ message: 'Invalid verification type' });
    }

    res.status(200).json({ 
      message: `${type} verified successfully`,
      emailVerified: verificationData.emailVerified,
      mobileVerified: verificationData.mobileVerified
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

// Route to complete signup
router.post('/complete-signup', async (req, res) => {
  try {
    const { verificationId, name, collegeId, password, role, club } = req.body;

    // Validate verification session
    const verificationData = verificationStore.get(verificationId);
    if (!verificationData || !verificationData.emailVerified || !verificationData.mobileVerified) {
      return res.status(400).json({ message: 'Please complete verification first' });
    }

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters with numbers and special characters' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      collegeId,
      email: verificationData.email,
      mobile: verificationData.mobile,
      password: hashedPassword,
      role,
      club: role === 'lead' ? club : undefined
    };

    // Handle admin and lead signups
    if (role === 'admin' || role === 'lead') {
      const newRequest = new SignupRequest(userData);
      await newRequest.save();

      // Fetch admin emails
      const admins = await Admin.find({});
      const adminEmails = admins.map(admin => admin.email);

      if (adminEmails.length === 0) {
        return res.status(500).json({ 
          message: 'No admins found in the system to approve your request' 
        });
      }

      // Send approval request email to admins
      await transporter.sendMail({
        from: 'varunreddy2new@gmail.com',
        to: adminEmails,
        subject: `GVPCE Club Connect - New ${role} Signup Request`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Signup Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${verificationData.email}</p>
            <p><strong>Mobile:</strong> ${verificationData.mobile}</p>
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
      });

      verificationStore.delete(verificationId);
      res.status(200).json({ 
        message: `${role} signup request submitted. Please wait for admin approval.` 
      });
    } 
    // Handle member signups
    else if (role === 'member') {
      const newMember = new Member(userData);
      await newMember.save();

      // Send welcome email
      await transporter.sendMail({
        from: 'varunreddy2new@gmail.com',
        to: verificationData.email,
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
      });

      verificationStore.delete(verificationId);
      res.status(200).json({ message: 'Member account created successfully' });
    } 
    else {
      return res.status(400).json({ message: 'Invalid role specified' });
    }
  } catch (error) {
    console.error('Signup completion error:', error);
    res.status(500).json({ message: 'Error completing signup' });
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

// Route to fetch pending signup requests
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
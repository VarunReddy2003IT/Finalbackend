const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');
const SignupRequest = require('../models/signuprequest');
const nodemailer = require('nodemailer');
const router = express.Router();
const axios = require('axios');

// Environment variables validation
if (!process.env.SINCH_API_KEY || !process.env.SINCH_PHONE_NUMBER) {
  console.error('Missing required Sinch environment variables');
  process.exit(1);
}

// Sinch setup with error handling
const sinchApiKey = process.env.SINCH_API_KEY;
const sinchPhoneNumber = process.env.SINCH_PHONE_NUMBER;

// Nodemailer setup with secure configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'varunreddy2new@gmail.com',
    pass: process.env.EMAIL_PASS || 'bmly geoo gwkg jasu',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
    process.exit(1);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Valid clubs list
const clubs = [
  'YES', 'NSS1', 'NSS2', 'YouthForSeva', 'YFS', 'WeAreForHelp', 'HOH',
  'Vidyadaan', 'Rotract', 'GCCC', 'IEEE', 'CSI', 'AlgoRhythm',
  'OpenForge', 'VLSID', 'SEEE', 'Sports'
];

// In-memory OTP stores with TTL
const emailOtpStore = new Map();
const mobileOtpStore = new Map();

// OTP cleanup interval (runs every hour)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of emailOtpStore.entries()) {
    if (now > value.expiry) emailOtpStore.delete(key);
  }
  for (const [key, value] of mobileOtpStore.entries()) {
    if (now > value.expiry) mobileOtpStore.delete(key);
  }
}, 3600000);

// Helper Functions
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gvpce\.ac\.in$/;
  return emailRegex.test(email);
};

const validateMobileNumber = (mobileNumber) => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobileNumber);
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  return passwordRegex.test(password);
};

const checkExistingUser = async (email) => {
  try {
    const queries = [
      SignupRequest.findOne({ email }),
      Admin.findOne({ email }),
      Lead.findOne({ email }),
      Member.findOne({ email }),
    ];

    const results = await Promise.all(queries);
    return results.find((result) => result !== null);
  } catch (error) {
    console.error('Error checking existing user:', error);
    throw new Error('Database error while checking existing user');
  }
};

const checkExistingUserMobile = async (mobileNumber) => {
  try {
    const queries = [
      SignupRequest.findOne({ mobileNumber }),
      Admin.findOne({ mobileNumber }),
      Lead.findOne({ mobileNumber }),
      Member.findOne({ mobileNumber }),
    ];

    const results = await Promise.all(queries);
    return results.find((result) => result !== null);
  } catch (error) {
    console.error('Error checking existing user:', error);
    throw new Error('Database error while checking existing user');
  }
};

const sendEmail = async (options) => {
  try {
    await transporter.sendMail(options);
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

const sendSMS = async (to, body) => {
  try {
    const response = await axios.post(
      'https://messagingapi.sinch.com/v1/sms', 
      {
        from: sinchPhoneNumber,
        to: to,
        body: body,
      },
      {
        headers: {
          'Authorization': `Application ${sinchApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`SMS sent successfully to ${to}`);
  } catch (error) {
    console.error('SMS sending error:', error);
    throw new Error('Failed to send SMS');
  }
};

// Route to send email OTP
router.post('/send-otp', async (req, res) => {
  console.log('Received email OTP request:', req.body);
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        message: 'Please use a valid GVPCE email address' 
      });
    }

    const existingUser = await checkExistingUser(email);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this email already exists' 
      });
    }

    const otp = generateOTP();
    emailOtpStore.set(email, {
      otp,
      expiry: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    await sendEmail({
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'GVPCE Club Connect - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Your OTP for GVPCE Club Connect signup is: <strong>${otp}</strong></p>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({ 
      message: 'OTP sent successfully to your email. Valid for 5 minutes.' 
    });
  } catch (error) {
    console.error('Email OTP send error:', error);
    res.status(500).json({ 
      message: 'Error sending email OTP. Please try again later.' 
    });
  }
});

// Route to send mobile OTP
router.post('/send-mobile-otp', async (req, res) => {
  console.log('Received mobile OTP request:', req.body);
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }

    if (!validateMobileNumber(mobileNumber)) {
      return res.status(400).json({ 
        message: 'Please enter a valid 10-digit Indian mobile number' 
      });
    }

    const existingUser = await checkExistingUserMobile(mobileNumber);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this mobile number already exists' 
      });
    }

    const otp = generateOTP();
    mobileOtpStore.set(mobileNumber, {
      otp,
      expiry: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    await sendSMS(
      mobileNumber,
      `Your GVPCE Club Connect mobile verification OTP is: ${otp}. Valid for 5 minutes.`
    );

    res.status(200).json({ 
      message: 'OTP sent successfully to your mobile number. Valid for 5 minutes.' 
    });
  } catch (error) {
    console.error('Mobile OTP send error:', error);
    res.status(500).json({ 
      message: 'Error sending mobile OTP. Please try again later.' 
    });
  }
});

// Route to verify OTPs and complete signup
router.post('/verify', async (req, res) => {
  console.log('Received verify request:', { ...req.body, password: '[REDACTED]' });
  try {
    const { 
      name, collegeId, email, mobileNumber, password, 
      role, club, emailOtp, mobileOtp 
    } = req.body;

    // Basic validation
    if (!name || !collegeId || !email || !mobileNumber || 
        !password || !role || !emailOtp || !mobileOtp) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Extended validation
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        message: 'Please use a valid GVPCE email address' 
      });
    }

    if (!validateMobileNumber(mobileNumber)) {
      return res.status(400).json({ 
        message: 'Please enter a valid 10-digit Indian mobile number' 
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long and contain a number and a special character' 
      });
    }

    // Verify email OTP
    const emailOtpEntry = emailOtpStore.get(email);
    if (!emailOtpEntry || emailOtpEntry.otp !== emailOtp) {
      return res.status(400).json({ message: 'Invalid or expired email OTP' });
    }

    // Verify mobile OTP
    const mobileOtpEntry = mobileOtpStore.get(mobileNumber);
    if (!mobileOtpEntry || mobileOtpEntry.otp !== mobileOtp) {
      return res.status(400).json({ message: 'Invalid or expired mobile OTP' });
    }

    // Hash password and create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new SignupRequest({
      name,
      collegeId,
      email,
      mobileNumber,
      password: hashedPassword,
      role,
      club
    });
    await newUser.save();

    // Clear OTPs after successful signup
    emailOtpStore.delete(email);
    mobileOtpStore.delete(mobileNumber);

    res.status(201).json({ message: 'Signup successful' });
  } catch (error) {
    console.error('Signup verification error:', error);
    res.status(500).json({ message: 'Error during signup verification. Please try again later.' });
  }
});

module.exports = router;

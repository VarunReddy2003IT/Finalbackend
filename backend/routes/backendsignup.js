const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');
const SignupRequest = require('../models/signuprequest');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const router = express.Router();

// Environment variables validation
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.error('Missing required Twilio environment variables');
  process.exit(1);
}

// Twilio setup with error handling
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Nodemailer setup with secure configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'varunreddy2new@gmail.com',
    pass: process.env.EMAIL_PASS || 'bmly geoo gwkg jasu'
  },
  tls: {
    rejectUnauthorized: false
  }
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
      Member.findOne({ email })
    ];
    
    const results = await Promise.all(queries);
    return results.find(result => result !== null);
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
      Member.findOne({ mobileNumber })
    ];
    
    const results = await Promise.all(queries);
    return results.find(result => result !== null);
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
    await twilioClient.messages.create({
      body,
      from: twilioPhoneNumber,
      to: `+91${to}`
    });
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
      attempts: 0
    });

    await sendEmail({
      from: process.env.EMAIL_USER || 'varunreddy2new@gmail.com',
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
      attempts: 0
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
    const emailOtpData = emailOtpStore.get(email);
    if (!emailOtpData || Date.now() > emailOtpData.expiry) {
      return res.status(400).json({ 
        message: 'Email OTP has expired. Please request a new OTP.' 
      });
    }

    if (emailOtpData.otp !== emailOtp) {
      emailOtpData.attempts += 1;
      if (emailOtpData.attempts >= 3) {
        emailOtpStore.delete(email);
        return res.status(400).json({ 
          message: 'Too many incorrect email OTP attempts. Please request a new OTP.' 
        });
      }
      return res.status(400).json({ 
        message: 'Invalid email OTP. Please try again.' 
      });
    }

    // Verify mobile OTP
    const mobileOtpData = mobileOtpStore.get(mobileNumber);
    if (!mobileOtpData || Date.now() > mobileOtpData.expiry) {
      return res.status(400).json({ 
        message: 'Mobile OTP has expired. Please request a new OTP.' 
      });
    }

    if (mobileOtpData.otp !== mobileOtp) {
      mobileOtpData.attempts += 1;
      if (mobileOtpData.attempts >= 3) {
        mobileOtpStore.delete(mobileNumber);
        return res.status(400).json({ 
          message: 'Too many incorrect mobile OTP attempts. Please request a new OTP.' 
        });
      }
      return res.status(400).json({ 
        message: 'Invalid mobile OTP. Please try again.' 
      });
    }

    // Clear used OTPs
    emailOtpStore.delete(email);
    mobileOtpStore.delete(mobileNumber);

    // Validate club for lead role
    if (role === 'lead') {
      if (!club || !clubs.includes(club)) {
        return res.status(400).json({ 
          message: 'Invalid club selection' 
        });
      }
    }

    // Final existing user check
    const existingUser = await checkExistingUser(email, mobileNumber);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with these credentials was created while verifying. Please try again with different credentials.' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle different role signups
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
      const admins = await Admin.find({}, 'email');
      const adminEmails = admins.map(admin => admin.email);

      if (adminEmails.length === 0) {
        return res.status(500).json({ 
          message: 'No admins found in the system to approve your request' 
        });
      }

      // Send email to admins
      await sendEmail({
        from: process.env.EMAIL_USER || 'varunreddy2new@gmail.com',
        to: adminEmails,
        subject: `GVPCE Club Connect - New ${role} Signup Request`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Signup Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Mobile:</strong> ${mobileNumber}</p>
            <p><strong>Role:</strong> ${role}</p>
            ${role === 'lead' ? `<p><strong>Club:</strong> ${club}</p>` : ''}
            <p><strong>College ID:</strong> ${collegeId}</p>
            <div style="margin-top: 20px;">
              <a href="${process.env.BACKEND_URL}/api/signup/approve/${newRequest._id}" 
                 style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; margin-right: 10px; border-radius: 5px;">
                Approve
              </a>
              <a href="${process.env.BACKEND_URL}/api/signup/reject/${newRequest._id}" 
                 style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Reject
              </a>
            </div>
          </div>
        `
      });

      res.status(200).json({ 
        message: `${role} signup request submitted successfully. Please wait for admin approval.` 
      });
    } 
    // Handle member signup
    else if (role === 'member') {
      const newMember = new Member({
        name,
        collegeId,
        email,
        mobileNumber,
        password: hashedPassword
      });

      await newMember.save();

      // Send welcome email
      await sendEmail({
        from: process.env.EMAIL_USER || 'varunreddy2new@gmail.com',
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
      });

      // Send welcome SMS
      await sendSMS(
        mobileNumber,
        `Welcome to GVPCE Club Connect! Your member account has been created successfully. You can now log in with your email and password.`
      );

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

// Route to approve signup request
router.get('/approve/:id', async (req, res) => {
  try {
    const signupRequest = await SignupRequest.findById(req.params.id);

    if (!signupRequest) {
      return res.status(404).json({ message: 'Signup request not found' });
    }

    const userData = {
      name: signupRequest.name,
      collegeId: signupRequest.collegeId,
      email: signupRequest.email,
      mobileNumber: signupRequest.mobileNumber,
      password: signupRequest.password,
      ...(signupRequest.role === 'lead' && { club: signupRequest.club })
    };

    let user;
    const ModelClass = signupRequest.role === 'admin' ? Admin : Lead;
    
    user = await ModelClass.findOneAndUpdate(
      { email: signupRequest.email },
      { $set: userData },
      { new: true, upsert: true }
    );

    // Send approval notifications
    await Promise.all([
      sendEmail({
        from: process.env.EMAIL_USER || 'varunreddy2new@gmail.com',
        to: signupRequest.email,
        subject: 'GVPCE Club Connect - Account Approved!',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Account Approved!</h2>
            <p>Dear ${signupRequest.name},</p>
            <p>Your account request has been approved. You can now log in to access the platform.</p>
            <p>Role: ${signupRequest.role}</p>
            ${signupRequest.role === 'lead' ? `<p>Club: ${signupRequest.club}</p>` : ''}
            <p>Email: ${signupRequest.email}</p>
            <p>Mobile: ${signupRequest.mobileNumber}</p>
          </div>
        `
      }),
      sendSMS(
        signupRequest.mobileNumber,
        `Your GVPCE Club Connect account has been approved! You can now log in with your email and password.`
      )
    ]);

    await SignupRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({ 
      message: `${signupRequest.role} account approved and created successfully` 
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ message: 'Error approving signup request' });
  }
});

// Route to reject signup request
router.get('/reject/:id', async (req, res) => {
  try {
    const signupRequest = await SignupRequest.findById(req.params.id);

    if (!signupRequest) {
      return res.status(404).json({ message: 'Signup request not found' });
    }

    // Send rejection notifications
    await Promise.all([
      sendEmail({
        from: process.env.EMAIL_USER || 'varunreddy2new@gmail.com',
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
      }),
      sendSMS(
        signupRequest.mobileNumber,
        `Your GVPCE Club Connect account request has been declined. If you believe this was a mistake, please try signing up again or contact support.`
      ),
      SignupRequest.findByIdAndDelete(req.params.id)
    ]);

    res.status(200).json({ message: 'Signup request rejected successfully' });
  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ message: 'Error rejecting signup request' });
  }
});

// Additional utility routes
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

router.post('/validate-mobile', async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!validateMobileNumber(mobileNumber)) {
      return res.status(400).json({ 
        message: 'Please enter a valid 10-digit Indian mobile number',
        valid: false 
      });
    }

    const existingUser = await checkExistingUser(null, mobileNumber);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this mobile number already exists',
        valid: false 
      });
    }

    res.status(200).json({ 
      message: 'Mobile number is valid and available',
      valid: true 
    });
  } catch (error) {
    console.error('Mobile validation error:', error);
    res.status(500).json({ 
      message: 'Error validating mobile number',
      valid: false 
    });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { type, email, mobileNumber } = req.body;

    if (type === 'email') {
      if (!email || !validateEmail(email)) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }

      const otp = generateOTP();
      emailOtpStore.set(email, {
        otp,
        expiry: Date.now() + 5 * 60 * 1000,
        attempts: 0
      });

      await sendEmail({
        from: process.env.EMAIL_USER || 'varunreddy2new@gmail.com',
        to: email,
        subject: 'GVPCE Club Connect - New Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Email Verification</h2>
            <p>Your new OTP for GVPCE Club Connect signup is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 5 minutes.</p>
          </div>
        `
      });
    } else if (type === 'mobile') {
      if (!mobileNumber || !validateMobileNumber(mobileNumber)) {
        return res.status(400).json({ message: 'Please provide a valid mobile number' });
      }

      const otp = generateOTP();
      mobileOtpStore.set(mobileNumber, {
        otp,
        expiry: Date.now() + 5 * 60 * 1000,
        attempts: 0
      });

      await sendSMS(
        mobileNumber,
        `Your new GVPCE Club Connect mobile verification OTP is: ${otp}. Valid for 5 minutes.`
      );
    } else {
      return res.status(400).json({ message: 'Invalid OTP type specified' });
    }

    res.status(200).json({ message: `New OTP sent successfully to your ${type}` });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: `Error resending OTP to ${type}` });
  }
});

module.exports = router;
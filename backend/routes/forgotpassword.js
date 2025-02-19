const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'varunreddy2new@gmail.com',
    pass: 'bmly geoo gwkg jasu',
  }
});

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Check if user exists in any role
    const admin = await Admin.findOne({ email });
    const lead = await Lead.findOne({ email });
    const member = await Member.findOne({ email });
    
    const user = admin || lead || member;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate and store OTP
    const otp = generateOTP();
    otpStore.set(email, {
      otp,
      timestamp: Date.now(),
      attempts: 0
    });

    // Send email
    const mailOptions = {
      from: 'varunreddy2new@gmail.com',
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. This OTP will expire in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

// Verify OTP route
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const storedData = otpStore.get(email);

  if (!storedData) {
    return res.status(400).json({ message: 'OTP expired or not requested' });
  }

  if (storedData.attempts >= 3) {
    otpStore.delete(email);
    return res.status(400).json({ message: 'Too many attempts. Please request new OTP' });
  }

  if (Date.now() - storedData.timestamp > 600000) { // 10 minutes
    otpStore.delete(email);
    return res.status(400).json({ message: 'OTP expired' });
  }

  if (storedData.otp !== otp) {
    storedData.attempts++;
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  res.json({ message: 'OTP verified successfully' });
});

// Reset password route
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const storedData = otpStore.get(email);

  if (!storedData || storedData.otp !== otp) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in all possible collections
    const updatePromises = [
      Admin.findOneAndUpdate({ email }, { password: hashedPassword }),
      Lead.findOneAndUpdate({ email }, { password: hashedPassword }),
      Member.findOneAndUpdate({ email }, { password: hashedPassword })
    ];

    await Promise.all(updatePromises);
    otpStore.delete(email);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error in reset password:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;
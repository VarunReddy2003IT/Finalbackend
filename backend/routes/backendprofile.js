const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
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

router.get('/', async (req, res) => {
    try {
        const { email, role } = req.query;

        if (!email || !role) {
            console.log('Missing required fields:', { email, role });
            return res.status(400).json({
                success: false,
                message: 'Email and role are required'
            });
        }

        let Model;
        switch (role.toLowerCase()) {
            case 'admin':
                Model = Admin;
                break;
            case 'lead':
                Model = Lead;
                break;
            case 'member':
                Model = Member;
                break;
            default:
                console.log('Invalid role provided:', role);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role'
                });
        }

        const userData = await Model.findOne(
            { email: email.toLowerCase() },
            { name: 1, email: 1, imageUrl: 1, club: 1, _id: 0,location:1 }
        );

        if (!userData) {
            console.log('User not found:', { email, role });
            return res.status(404).json({
                success: false,
                message: `User not found in ${role} database`
            });
        }

        console.log('User found:', userData);
        res.status(200).json({
            success: true,
            data: userData
        });

    } catch (error) {
        console.error('Profile route error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving user profile'
        });
    }
});

router.post('/update-profile', async (req, res) => {
    try {
        const { email, role, imageUrl, name, location } = req.body;
        
        if (!email || !role) {
            console.log('Missing required fields:', { email, role });
            return res.status(400).json({
                success: false,
                message: 'Email and role are required'
            });
        }

        let Model;
        switch (role.toLowerCase()) {
            case 'admin':
                Model = Admin;
                break;
            case 'lead':
                Model = Lead;
                break;
            case 'member':
                Model = Member;
                break;
            default:
                console.log('Invalid role provided:', role);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role'
                });
        }

        // Create update object with only provided fields
        const updateFields = {};
        if (imageUrl) updateFields.imageUrl = imageUrl;
        if (name) updateFields.name = name;
        if (location !== undefined) updateFields.location = location;

        // Only proceed if there are fields to update
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const updatedUser = await Model.findOneAndUpdate(
            { email: email.toLowerCase() },
            { $set: updateFields },
            { new: true }
        );

        if (!updatedUser) {
            console.log('User not found for update:', { email, role });
            return res.status(404).json({
                success: false,
                message: `User not found in ${role} database`
            });
        }

        console.log('User profile updated successfully:', updatedUser);
        res.status(200).json({
            success: true,
            data: updatedUser
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user profile'
        });
    }
});

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Request delete OTP route
router.post('/request-delete-otp', async (req, res) => {
    try {
        const { email, role } = req.body;

        if (!email || !role) {
            console.log('Missing required fields:', { email, role });
            return res.status(400).json({
                success: false,
                message: 'Email and role are required'
            });
        }

        let Model;
        switch (role.toLowerCase()) {
            case 'admin':
                Model = Admin;
                break;
            case 'lead':
                Model = Lead;
                break;
            case 'member':
                Model = Member;
                break;
            default:
                console.log('Invalid role provided:', role);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role'
                });
        }

        const user = await Model.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('User not found:', { email, role });
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const otp = generateOTP();
        otpStore.set(email, {
            otp,
            timestamp: Date.now(),
            attempts: 0
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Account Deletion OTP',
            text: `Your OTP for account deletion is: ${otp}\nThis OTP will expire in 5 minutes.\nIf you did not request this, please ignore this email.`
        };

        await transporter.sendMail(mailOptions);
        console.log('OTP sent successfully to:', email);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });

    } catch (error) {
        console.error('OTP request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending OTP'
        });
    }
});

// Delete account route
router.post('/delete-account', async (req, res) => {
    try {
        const { email, role, otp } = req.body;

        if (!email || !role || !otp) {
            console.log('Missing required fields:', { email, role, otp });
            return res.status(400).json({
                success: false,
                message: 'Email, role, and OTP are required'
            });
        }

        const storedOTPData = otpStore.get(email);
        if (!storedOTPData) {
            console.log('OTP not found or expired:', email);
            return res.status(400).json({
                success: false,
                message: 'OTP expired or not requested'
            });
        }

        if (Date.now() - storedOTPData.timestamp > 5 * 60 * 1000) {
            console.log('OTP expired:', email);
            otpStore.delete(email);
            return res.status(400).json({
                success: false,
                message: 'OTP expired'
            });
        }

        if (storedOTPData.otp !== otp) {
            storedOTPData.attempts += 1;
            console.log('Invalid OTP attempt:', { email, attempts: storedOTPData.attempts });
            
            if (storedOTPData.attempts >= 3) {
                otpStore.delete(email);
                return res.status(400).json({
                    success: false,
                    message: 'Too many failed attempts. Please request a new OTP'
                });
            }
            
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        let Model;
        switch (role.toLowerCase()) {
            case 'admin':
                Model = Admin;
                break;
            case 'lead':
                Model = Lead;
                break;
            case 'member':
                Model = Member;
                break;
            default:
                console.log('Invalid role provided:', role);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role'
                });
        }

        const result = await Model.deleteOne({ email: email.toLowerCase() });
        
        if (result.deletedCount === 0) {
            console.log('User not found for deletion:', { email, role });
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        otpStore.delete(email);
        console.log('Account deleted successfully:', { email, role });

        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting account'
        });
    }
});

module.exports = router;
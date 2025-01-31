const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');

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
            { name: 1, email: 1, imageUrl: 1,club:1, _id: 0 } // Include imageUrl in the response
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

// Route to update user profile with Cloudinary image URL
router.post('/update-profile', async (req, res) => {
    try {
        const { email, role, imageUrl } = req.body;
        console.log(imageUrl);
        if (!email || !role || !imageUrl) {
            console.log('Missing required fields:', { email, role, imageUrl });
            return res.status(400).json({
                success: false,
                message: 'Email, role, and imageUrl are required'
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

        const updatedUser = await Model.findOneAndUpdate(
            { email: email.toLowerCase() },
            { $set : { imageUrl } },
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

module.exports = router;

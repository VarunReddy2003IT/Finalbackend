const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');

// Get user profile based on role and email
router.get('/profile', async (req, res) => {
    try {
        const { email, role } = req.query;

        if (!email || !role) {
            return res.status(400).json({
                success: false,
                message: 'Email and role are required'
            });
        }

        // Select the appropriate model based on role
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
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role'
                });
        }

        // Find user in the appropriate collection
        const userData = await Model.findOne(
            { email },
            { name: 1, email: 1, _id: 0 }  // Only retrieve name and email
        );

        if (!userData) {
            return res.status(404).json({
                success: false,
                message: `User not found in ${role} database`
            });
        }

        res.status(200).json({
            success: true,
            data: userData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving user profile'
        });
    }
});

module.exports = router;
// routes/admin.js
const router = require('express').Router();
const Lead = require('../models/lead');
const Member = require('../models/member');

// Get all members
router.get('/all-members', async (req, res) => {
    try {
        const members = await Member.find({});
        res.json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching members'
        });
    }
});

// Get all leads
router.get('/all-leads', async (req, res) => {
    try {
        const leads = await Lead.find({});
        res.json({
            success: true,
            data: leads
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leads'
        });
    }
});

// Delete user
router.delete('/delete-user', async (req, res) => {
    const { email, role } = req.body;

    if (!email || !role) {
        return res.status(400).json({
            success: false,
            message: 'Email and role are required'
        });
    }

    try {
        let deletedUser;
        
        if (role === 'member') {
            deletedUser = await Member.findOneAndDelete({ 
                email: email.toLowerCase() 
            });
        } else if (role === 'lead') {
            deletedUser = await Lead.findOneAndDelete({ 
                email: email.toLowerCase() 
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }
        
        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: `${role} not found`
            });
        }

        res.json({
            success: true,
            message: `${role} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
});

module.exports = router;
// routes/admin.js
const router = require('express').Router();
const Lead = require('../models/lead');
const Member = require('../models/member');

// Get all members
router.get('/all-members', async (req, res) => {
    try {
        const { club, searchTerm } = req.query;
        let query = {};

        // Add club filter if provided
        if (club) {
            query.club = club;
        }

        // Add search filter if provided
        if (searchTerm) {
            query.$or = [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const members = await Member.find(query)
            .select('-password')  // Exclude password from results
            .sort({ name: 1 });   // Sort by name ascending

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

// Get members by club
router.get('/members-by-club', async (req, res) => {
    try {
        const { clubName } = req.query;

        if (!clubName) {
            return res.status(400).json({
                success: false,
                message: 'Club name is required'
            });
        }

        const members = await Member.find({ club: clubName })
            .select('-password')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error('Error fetching members by club:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching members'
        });
    }
});

// Get all leads
router.get('/all-leads', async (req, res) => {
    try {
        const { club, searchTerm } = req.query;
        let query = {};

        if (club) {
            query.club = club;
        }

        if (searchTerm) {
            query.$or = [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const leads = await Lead.find(query)
            .select('-password')
            .sort({ name: 1 });

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
        const normalizedEmail = email.toLowerCase();

        if (role === 'member') {
            deletedUser = await Member.findOneAndDelete({
                email: normalizedEmail
            });
        } else if (role === 'lead') {
            deletedUser = await Lead.findOneAndDelete({
                email: normalizedEmail
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
            message: `${role} deleted successfully`,
            data: deletedUser
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
});

// Update user
router.put('/update-user', async (req, res) => {
    const { email, role, updates } = req.body;

    if (!email || !role || !updates) {
        return res.status(400).json({
            success: false,
            message: 'Email, role, and updates are required'
        });
    }

    try {
        let updatedUser;
        const normalizedEmail = email.toLowerCase();

        // Remove sensitive fields from updates
        delete updates.password;
        delete updates.email;  // Prevent email changes through this route

        if (role === 'member') {
            updatedUser = await Member.findOneAndUpdate(
                { email: normalizedEmail },
                { $set: updates },
                { new: true }
            ).select('-password');
        } else if (role === 'lead') {
            updatedUser = await Lead.findOneAndUpdate(
                { email: normalizedEmail },
                { $set: updates },
                { new: true }
            ).select('-password');
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: `${role} not found`
            });
        }

        res.json({
            success: true,
            message: `${role} updated successfully`,
            data: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user'
        });
    }
});

module.exports = router;
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
                message: '${role} not found'
            });
        }

        res.json({
            success: true,
            message: '${role} deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
});
// Get members by club name
router.get('/members-by-club', async (req, res) => {
    const { clubName } = req.query; // Get club name from query parameters

    if (!clubName) {
        return res.status(400).json({
            success: false,
            message: 'Club name is required'
        });
    }

    try {
        // Run both queries in parallel
        const [members, leads] = await Promise.all([
            Member.find({ selectedClubs: clubName }),
            Lead.find({ selectedClubs: clubName })
        ]);

        // Merge both collections
        const allMembers = [...members, ...leads];

        res.json({
            success: true,
            data: allMembers
        });
    } catch (error) {
        console.error('Error fetching members by club:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching members by club'
        });
    }
});


// Remove a club from a member's selectedClubs array
router.put('/remove-club', async (req, res) => {
    const { email, clubName } = req.body;

    if (!email || !clubName) {
        return res.status(400).json({
            success: false,
            message: 'Email and club name are required'
        });
    }

    try {
        const member = await Member.findOne({ email: email.toLowerCase() });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Remove the club from the selectedClubs array
        const updatedClubs = member.selectedClubs.filter(club => club !== clubName);

        // Update the member's selectedClubs
        member.selectedClubs = updatedClubs;
        await member.save();

        res.json({
            success: true,
            message: 'Club removed successfully'
        });
    } catch (error) {
        console.error('Error removing club from member:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing club from member'
        });
    }
});


module.exports = router;
// routes.js

const express = require('express');
const router = express.Router();
const User = require('../models/profile');
const cloudinary = require('../utils/cloudinaryConfig');

// Get user profile data
router.get('/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user data' });
    }
});

// Update user's image URL
router.put('/update-image/:email', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { email: req.params.email },
            { imageUrl },
            { new: true }
        );
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Error updating image URL' });
    }
});

module.exports = router;

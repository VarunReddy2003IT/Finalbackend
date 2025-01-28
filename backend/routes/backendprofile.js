// routes/profile.js
const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');
const cloudinary = require('../utils/cloudinaryConfig');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Get profile based on role
router.get('/api/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const role = req.query.role;
    let userProfile;

    switch (role) {
      case 'admin':
        userProfile = await Admin.findOne({ email });
        break;
      case 'lead':
        userProfile = await Lead.findOne({ email });
        break;
      case 'member':
        userProfile = await Member.findOne({ email });
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (!userProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const { password, ...profileData } = userProfile.toObject();
    res.json(profileData);

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Upload avatar
router.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { email, role } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'avatars'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    let userProfile;
    switch (role) {
      case 'admin':
        userProfile = await Admin.findOneAndUpdate(
          { email },
          { avatar: result.secure_url },
          { new: true }
        );
        break;
      case 'lead':
        userProfile = await Lead.findOneAndUpdate(
          { email },
          { avatar: result.secure_url },
          { new: true }
        );
        break;
      case 'member':
        userProfile = await Member.findOneAndUpdate(
          { email },
          { avatar: result.secure_url },
          { new: true }
        );
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    res.json({ avatarUrl: result.secure_url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Error uploading avatar' });
  }
});

// Update profile
router.put('/api/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { role, ...updateData } = req.body;
    let userProfile;

    delete updateData.password;

    switch (role) {
      case 'admin':
        userProfile = await Admin.findOneAndUpdate(
          { email },
          updateData,
          { new: true }
        );
        break;
      case 'lead':
        userProfile = await Lead.findOneAndUpdate(
          { email },
          updateData,
          { new: true }
        );
        break;
      case 'member':
        userProfile = await Member.findOneAndUpdate(
          { email },
          updateData,
          { new: true }
        );
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (!userProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const { password, ...profileData } = userProfile.toObject();
    res.json(profileData);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

module.exports = router;
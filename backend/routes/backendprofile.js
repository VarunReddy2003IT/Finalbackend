const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');
const cloudinary = require('../utils/cloudinaryConfig');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to get model based on role
const getModelByRole = (role) => {
  const models = {
    admin: Admin,
    lead: Lead,
    member: Member
  };
  return models[role];
};

// Validation middleware
const validateProfileUpdate = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'lead', 'member']).withMessage('Invalid role')
];

// Get profile based on role
router.get('/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const role = req.query.role?.toLowerCase();

    if (!email || !role) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and role are required' 
      });
    }

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role' 
      });
    }

    const userProfile = await Model.findOne({ email });
    if (!userProfile) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    const { password, __v, ...profileData } = userProfile.toObject();
    res.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload avatar
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    if (!email || !role) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and role are required' 
      });
    }

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role' 
      });
    }

    // Check if user exists
    const existingUser = await Model.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Upload to cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          resource_type: 'image',
          allowed_formats: ['jpg', 'png', 'jpeg'],
          transformation: [
            { width: 400, height: 400, crop: 'fill' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    // Update user profile with new avatar
    const userProfile = await Model.findOneAndUpdate(
      { email },
      { 
        avatar: result.secure_url,
        avatarPublicId: result.public_id 
      },
      { new: true }
    );

    // Delete old avatar if exists
    if (existingUser.avatarPublicId) {
      await cloudinary.uploader.destroy(existingUser.avatarPublicId);
    }

    res.json({
      success: true,
      data: {
        avatarUrl: result.secure_url
      }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error uploading avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update profile
router.put('/:email', validateProfileUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email } = req.params;
    const { role, ...updateData } = req.body;

    // Remove sensitive fields from update
    delete updateData.password;
    delete updateData.email; // Prevent email updates through this endpoint

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role' 
      });
    }

    const userProfile = await Model.findOneAndUpdate(
      { email },
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!userProfile) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    const { password, __v, ...profileData } = userProfile.toObject();
    res.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
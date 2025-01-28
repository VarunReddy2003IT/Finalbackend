const express = require('express');
const router = express.Router();
const cloudinary = require('../utils/cloudinaryConfig'); // Your cloudinary config
const multer = require('multer');
const storage = multer.memoryStorage();  // Use memory storage to store file buffer in memory
const upload = multer({ storage: storage }); // Handle file uploads in memory

// Image upload route
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(file.buffer, {
      upload_preset: 'ml_default', // Replace with your Cloudinary upload preset
    });

    // Return the uploaded image URL
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Error uploading the image' });
  }
});

module.exports = router;

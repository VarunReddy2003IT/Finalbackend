const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dc2qstjvr', // Replace with your Cloudinary cloud name
  api_key: '423825111641525', // Replace with your Cloudinary API key
  api_secret: 'Kn_RUU6b_cSa_v4YfRvlHaIeRYA', // Replace with your Cloudinary API secret
});

module.exports = cloudinary;

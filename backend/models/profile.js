// profile.js (Mongoose Model)

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    collegeId: String,
    email: String,
    imageUrl: {
        type: String,
        default: '' // Default empty string for new users
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

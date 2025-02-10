const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'SIGNUP_REQUEST', 'SYSTEM', etc.
  title: { type: String, required: true },
  message: { type: String, required: true },
  requestData: {
    requestId: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    role: String,
    club: String,
    collegeId: String,
    mobilenumber: String
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  collegeId: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  mobilenumber: { 
    type: String, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  notifications: [notificationSchema],
  unreadNotifications: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  imageUrl: { 
    type: String, 
    default: null 
  }
});

// Method to add notification
adminSchema.methods.addNotification = async function(notification) {
  this.notifications.unshift(notification);
  this.unreadNotifications += 1;
  await this.save();
};

// Method to mark notification as read
adminSchema.methods.markNotificationAsRead = async function(notificationId) {
  const notification = this.notifications.id(notificationId);
  if (notification && !notification.read) {
    notification.read = true;
    this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
    await this.save();
  }
};

module.exports = mongoose.model('Admin', adminSchema, 'Admin');
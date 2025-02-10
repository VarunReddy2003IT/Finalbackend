const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');

// Fetch notifications for the logged-in admin
router.get('/', async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId); // Assuming you're using JWT for authentication
    res.json({
      notifications: admin.notifications,
      unreadNotifications: admin.unreadNotifications,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.put('/read/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId);
    const notification = admin.notifications.id(req.params.id);

    if (notification && !notification.read) {
      notification.read = true;
      admin.unreadNotifications = Math.max(0, admin.unreadNotifications - 1);
      await admin.save();
      res.status(200).json({ message: 'Notification marked as read' });
    } else {
      res.status(400).json({ message: 'Notification already read or not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

module.exports = router;

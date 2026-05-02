const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'সব নোটিফিকেশন পড়া হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});
// DELETE /api/notifications — সব notification মুছুন (এটা আগে থাকতে হবে)
router.delete('/', protect, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'সব নোটিফিকেশন মুছে ফেলা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// DELETE /api/notifications/:id — একটা notification মুছুন (এটা পরে থাকবে)
router.delete('/:id', protect, async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user._id 
    });
    if (!notif) return res.status(404).json({ success: false, message: 'নোটিফিকেশন পাওয়া যায়নি।' });
    res.json({ success: true, message: 'মুছে ফেলা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

module.exports = router;

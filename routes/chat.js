const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { protect, adminOnly } = require('../middleware/auth');

const DEFAULT_MSG = `আসসালামুয়ালাইকুম! বিনিয়োগ অ্যাপে স্বাগতম 🎉\n\nযেকোনো সমস্যা বা সহযোগিতার জন্য আমাদের সাথে সরাসরি যোগাযোগ করুন উপরে থাকা WhatsApp এবং Telegram Contact-এ আমরা সবসময় নিয়োজিত আছি আপনাদের সেবা প্রদানে। ধন্যবাদ! 💚\n\nসাপোর্ট টিমঃ বিনিয়োগ অথেরিটি।`;
// GET /api/chat — user এর chat লোড করো
router.get('/', protect, async (req, res) => {
  try {
    let chat = await Chat.findOne({ user: req.user._id });
    if (!chat) {
      chat = await Chat.create({
        user: req.user._id,
        messages: [{ sender: 'admin', message: DEFAULT_MSG }],
        lastMessage: DEFAULT_MSG
      });
    }
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// POST /api/chat — user message পাঠাও
router.post('/', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'মেসেজ দিন।' });
    let chat = await Chat.findOne({ user: req.user._id });
    if (!chat) {
      chat = await Chat.create({
        user: req.user._id,
        messages: [{ sender: 'admin', message: DEFAULT_MSG }],
        lastMessage: DEFAULT_MSG
      });
    }
    chat.messages.push({ sender: 'user', message });
    chat.lastMessage = message;
    chat.updatedAt = new Date();
    await chat.save();
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// GET /api/chat/all — admin সব chat দেখবে
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'অ্যাক্সেস নেই।' });
    const chats = await Chat.find().populate('user', 'name mobile').sort({ updatedAt: -1 });
    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// POST /api/chat/:userId/reply — admin reply করবে
router.post('/:userId/reply', protect, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'অ্যাক্সেস নেই।' });
    const { message } = req.body;
    const chat = await Chat.findOne({ user: req.params.userId });
    if (!chat) return res.status(404).json({ success: false, message: 'চ্যাট পাওয়া যায়নি।' });
    chat.messages.push({ sender: 'admin', message });
    chat.lastMessage = message;
    chat.updatedAt = new Date();
    await chat.save();
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});
// DELETE /api/chat/:userId — admin chat মুছবে
router.delete('/:userId', protect, adminOnly, async (req, res) => {
  try {
    await Chat.findOneAndDelete({ user: req.params.userId });
    res.json({ success: true, message: 'চ্যাট মুছে ফেলা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

module.exports = router;

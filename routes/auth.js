const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, mobile, password, referralCode } = req.body;
    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'নাম, মোবাইল এবং পাসওয়ার্ড দেওয়া আবশ্যক।' });
    }
    const existing = await User.findOne({ mobile });
    if (existing) return res.status(400).json({ success: false, message: 'এই মোবাইল নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে।' });

    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) referredBy = referrer._id;
    }

    const user = await User.create({ name, mobile, password, referredBy });
    if (referredBy) {
      await User.findByIdAndUpdate(referredBy, { $inc: { referralCount: 1 } });
    }
    await Notification.create({
      user: user._id,
      title: 'স্বাগতম!',
      message: `আপনার বিনিয়োগ অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। আজই বিনিয়োগ শুরু করুন!`,
      type: 'success', icon: 'celebration'
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!',
      token,
      user: { id: user._id, name: user.name, mobile: user.mobile, role: user.role, balance: user.balance, referralCode: user.referralCode }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors)[0].message });
    }
    console.error('Signup Error:', error);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা। একটু পর চেষ্টা করুন।' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ success: false, message: 'মোবাইল ও পাসওয়ার্ড দিন।' });

    const user = await User.findOne({ mobile }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'মোবাইল নম্বর বা পাসওয়ার্ড ভুল।' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'অ্যাকাউন্ট নিষ্ক্রিয়। সাপোর্টে যোগাযোগ করুন।' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'মোবাইল নম্বর বা পাসওয়ার্ড ভুল।' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    res.json({
      success: true, message: 'লগইন সফল!', token,
      user: { id: user._id, name: user.name, mobile: user.mobile, role: user.role, balance: user.balance, referralCode: user.referralCode, totalDeposit: user.totalDeposit, totalProfit: user.totalProfit }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user: { id: user._id, name: user.name, mobile: user.mobile, role: user.role, balance: user.balance, totalDeposit: user.totalDeposit, totalWithdraw: user.totalWithdraw, totalProfit: user.totalProfit, referralCode: user.referralCode, referralEarnings: user.referralEarnings, referralCount: user.referralCount, referralBonusUsed: user.referralBonusUsed, bkashNumber: user.bkashNumber, nagadNumber: user.nagadNumber, nidNumber: user.nidNumber, isVerified: user.isVerified, createdAt: user.createdAt, lastLogin: user.lastLogin } });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bkashNumber, nagadNumber, nidNumber } = req.body;
    const update = {};
    if (name) update.name = name;
    if (bkashNumber !== undefined) update.bkashNumber = bkashNumber;
    if (nagadNumber !== undefined) update.nagadNumber = nagadNumber;
    if (nidNumber !== undefined) update.nidNumber = nidNumber;

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    res.json({ success: true, message: 'প্রোফাইল আপডেট হয়েছে!', user: { id: user._id, name: user.name, mobile: user.mobile, bkashNumber: user.bkashNumber, nagadNumber: user.nagadNumber, nidNumber: user.nidNumber } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'আপডেট ব্যর্থ হয়েছে।' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'বর্তমান পাসওয়ার্ড ভুল।' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তন হয়েছে!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ।' });
  }
});
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { name, mobile } = req.body;
    if (!name || !mobile) return res.status(400).json({ success: false, message: 'নাম ও মোবাইল নম্বর দিন।' });

    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ success: false, message: 'এই নম্বরে কোনো অ্যাকাউন্ট নেই।' });

    // নাম match করো (case insensitive)
    const inputName = name.trim().toLowerCase();
    const userName = user.name.trim().toLowerCase();
    if (inputName !== userName) return res.status(400).json({ success: false, message: 'নাম ও মোবাইল নম্বর মিলছে না।' });

    // Temporary token generate করো
    const token = require('crypto').randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 মিনিট
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'যাচাই সফল!', resetToken: token });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ success: false, message: 'সব তথ্য দিন।' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });

    const user = await User.findOne({ resetToken, resetTokenExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'লিংক মেয়াদ শেষ। আবার চেষ্টা করুন।' });

    user.password = newPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তন হয়েছে! এখন লগইন করুন।' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

module.exports = router;

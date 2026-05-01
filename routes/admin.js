const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Plan = require('../models/Plan');
const Investment = require('../models/Investment');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// ── Dashboard Stats ──────────────────────
// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalDeposit, pendingDeposits, pendingWithdraws, totalInvestments] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      Transaction.aggregate([{ $match: { type: 'deposit', status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transaction.countDocuments({ type: 'deposit', status: 'pending' }),
      Transaction.countDocuments({ type: 'withdraw', status: 'pending' }),
      Investment.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    const pendingWithdrawAmount = await Transaction.aggregate([
      { $match: { type: 'withdraw', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalDeposit: totalDeposit[0]?.total || 0,
        pendingDeposits,
        pendingWithdraws,
        pendingWithdrawAmount: pendingWithdrawAmount[0]?.total || 0,
        totalActiveInvestment: totalInvestments[0]?.total || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// ── Users ────────────────────────────────
// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query = { role: 'user' };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { mobile: { $regex: search, $options: 'i' } }];
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const total = await User.countDocuments(query);
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    await Notification.create({ user: user._id, title: user.isActive ? 'অ্যাকাউন্ট সক্রিয়' : 'অ্যাকাউন্ট নিষ্ক্রিয়', message: user.isActive ? 'আপনার অ্যাকাউন্ট সক্রিয় করা হয়েছে।' : 'আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে।', type: user.isActive ? 'success' : 'warning', icon: 'person' });
    res.json({ success: true, message: `অ্যাকাউন্ট ${user.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// POST /api/admin/users/:id/add-balance
router.post('/users/:id/add-balance', async (req, res) => {
  try {
    const { amount, note } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
    user.balance += parseFloat(amount);
user.totalProfit += parseFloat(amount);
await user.save({ validateBeforeSave: false });
    await Transaction.create({ user: user._id, type: 'profit', amount: parseFloat(amount), status: 'approved', paymentMethod: 'system', adminNote: note || 'অ্যাডমিন কর্তৃক যোগ করা হয়েছে', processedBy: req.user._id, processedAt: new Date() });
    await Notification.create({ user: user._id, title: 'ব্যালেন্স যোগ হয়েছে', message: `আপনার অ্যাকাউন্টে ৳${amount} যোগ করা হয়েছে।`, type: 'success', icon: 'payments' });
    res.json({ success: true, message: 'ব্যালেন্স যোগ করা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// ── Transactions ─────────────────────────
// GET /api/admin/transactions
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    const total = await Transaction.countDocuments(query);
    const txns = await Transaction.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).populate('user', 'name mobile').populate('plan', 'name');
    res.json({ success: true, transactions: txns, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// PUT /api/admin/transactions/:id/approve
router.put('/transactions/:id/approve', async (req, res) => {
  try {
    const { note } = req.body;
    const txn = await Transaction.findById(req.params.id).populate('user');
    if (!txn || txn.status !== 'pending') return res.status(400).json({ success: false, message: 'ট্র্যানজেকশন পাওয়া যায়নি বা আগেই প্রসেস হয়েছে।' });

    const user = await User.findById(txn.user._id || txn.user);

    txn.status = 'approved';
    txn.adminNote = note || null;
    txn.processedBy = req.user._id;
    txn.processedAt = new Date();
    await txn.save();

    if (txn.type === 'deposit') {
      user.balance += txn.amount;
      user.totalDeposit += txn.amount;
      await user.save({ validateBeforeSave: false });
      await Notification.create({ user: user._id, title: 'ডিপোজিট অনুমোদিত', message: `৳${txn.amount} ডিপোজিট অনুমোদন হয়েছে। ব্যালেন্স আপডেট হয়েছে।`, type: 'success', icon: 'check_circle' });
    }

    if (txn.type === 'withdraw') {
      user.totalWithdraw += txn.amount;
      await user.save({ validateBeforeSave: false });
      await Notification.create({ user: user._id, title: 'উইথড্র সম্পন্ন', message: `৳${txn.amount} উইথড্র সফলভাবে পাঠানো হয়েছে।`, type: 'success', icon: 'check_circle' });
    }

    res.json({ success: true, message: 'অনুমোদন সম্পন্ন।' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// PUT /api/admin/transactions/:id/reject
router.put('/transactions/:id/reject', async (req, res) => {
  try {
    const { note } = req.body;
    const txn = await Transaction.findById(req.params.id);
    if (!txn || txn.status !== 'pending') return res.status(400).json({ success: false, message: 'ট্র্যানজেকশন পাওয়া যায়নি।' });

    txn.status = 'rejected';
    txn.adminNote = note || null;
    txn.processedBy = req.user._id;
    txn.processedAt = new Date();
    await txn.save();

    // If withdraw was rejected, refund balance
    if (txn.type === 'withdraw') {
      await User.findByIdAndUpdate(txn.user, { $inc: { balance: txn.amount } });
      await Transaction.create({ user: txn.user, type: 'refund', amount: txn.amount, status: 'completed', paymentMethod: 'system', adminNote: 'উইথড্র বাতিল - ব্যালেন্স ফেরত' });
    }

    await Notification.create({ user: txn.user, title: 'আবেদন বাতিল', message: `আপনার ${txn.type === 'deposit' ? 'ডিপোজিট' : 'উইথড্র'} আবেদন বাতিল হয়েছে। ${note || ''}`, type: 'error', icon: 'cancel' });

    res.json({ success: true, message: 'বাতিল করা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// ── Plans ────────────────────────────────
// GET /api/admin/plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1 });
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// POST /api/admin/plans
router.post('/plans', async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json({ success: true, message: 'প্ল্যান তৈরি হয়েছে।', plan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/plans/:id
router.put('/plans/:id', async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: 'প্ল্যান আপডেট হয়েছে।', plan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/plans/:id
router.delete('/plans/:id', async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'প্ল্যান মুছে ফেলা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// ── Broadcast Notification ───────────────
// POST /api/admin/notify-all
router.post('/notify-all', async (req, res) => {
  try {
    const { title, message, type = 'info' } = req.body;
    const users = await User.find({ role: 'user', isActive: true }).select('_id');
    const notifications = users.map(u => ({ user: u._id, title, message, type, icon: 'campaign' }));
    await Notification.insertMany(notifications);
    res.json({ success: true, message: `${users.length} জন ইউজারকে নোটিফিকেশন পাঠানো হয়েছে।` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});
const Setting = require('../models/Setting');
 
// GET /api/admin/settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});
 
// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
  try {
    const { bkashNumber, nagadNumber, rocketNumber, minDeposit, minWithdraw } = req.body;
    let settings = await Setting.findOne();
    if (!settings) settings = new Setting();
    if (bkashNumber  !== undefined) settings.bkashNumber  = bkashNumber;
    if (nagadNumber  !== undefined) settings.nagadNumber  = nagadNumber;
    if (rocketNumber !== undefined) settings.rocketNumber = rocketNumber;
    if (minDeposit   !== undefined) settings.minDeposit   = minDeposit;
    if (minWithdraw  !== undefined) settings.minWithdraw  = minWithdraw;
    await settings.save();
    res.json({ success: true, message: 'সেটিংস সংরক্ষিত হয়েছে।', settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});
// GET /api/admin/investments
router.get('/investments', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const total = await Investment.countDocuments(query);
    const investments = await Investment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'name mobile')
      .populate('plan', 'name icon');

    res.json({ success: true, investments, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});
module.exports = router;

const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// POST /api/transaction/deposit
router.post('/deposit', protect, async (req, res) => {
  try {
    const { amount, paymentMethod, senderNumber, transactionId } = req.body;
    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'সর্বনিম্ন ডিপোজিট ১০০ টাকা।' });
    }
    if (!senderNumber || !transactionId) {
      return res.status(400).json({ success: false, message: 'প্রেরকের নম্বর ও ট্র্যানজেকশন আইডি দিন।' });
    }

    // Check duplicate TrxID
    const dup = await Transaction.findOne({ transactionId });
    if (dup) return res.status(400).json({ success: false, message: 'এই ট্র্যানজেকশন আইডি আগেই ব্যবহার হয়েছে।' });

    const txn = await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'bkash',
      senderNumber,
      transactionId,
      status: 'pending'
    });

    await Notification.create({
      user: req.user._id,
      title: 'ডিপোজিট আবেদন পেয়েছি',
      message: `${amount} টাকার ডিপোজিট রিকুয়েস্ট পেয়েছি। অ্যাডমিন অনুমোদন করলে যোগ হবে।`,
      type: 'info', icon: 'payments'
    });

    res.status(201).json({ success: true, message: 'ডিপোজিট আবেদন পাঠানো হয়েছে! অ্যাডমিন অনুমোদনের জন্য অপেক্ষা করুন।', transaction: { id: txn._id, receiptNo: txn.receiptNo, amount: txn.amount, status: txn.status } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// POST /api/transaction/withdraw
router.post('/withdraw', protect, async (req, res) => {
  try {
    // ── উইথড্র সময় চেক (সকাল ১০টা - সন্ধ্যা ৬টা, বাংলাদেশ সময়) ──
    const now = new Date();
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const hour = bdTime.getHours();
    const minute = bdTime.getMinutes();
    const currentMinutes = hour * 60 + minute;
    const openMinutes = 10 * 60;   // সকাল ১০:০০
    const closeMinutes = 18 * 60;  // সন্ধ্যা ৬:০০

    if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
      return res.status(400).json({
        success: false,
        message: 'উইথড্র সময় শেষ। সকাল ১০:০০ থেকে সন্ধ্যা ৬:০০ এর মধ্যে উইথড্র করুন।'
      });
    }
    const { amount, paymentMethod, senderNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (!amount || amount < 120) {
      return res.status(400).json({ success: false, message: 'সর্বনিম্ন উইথড্র ১২০ টাকা।' });
    }
    if (user.balance < amount) {
      return res.status(400).json({ success: false, message: `পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${user.balance}` });
    }
    if (!senderNumber) {
      return res.status(400).json({ success: false, message: 'আপনার প্রাপক নম্বর দিন।' });
    }

    // Deduct balance immediately (hold)
    user.balance -= parseFloat(amount);
    await user.save({ validateBeforeSave: false });

    const txn = await Transaction.create({
      user: req.user._id,
      type: 'withdraw',
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'bkash',
      senderNumber,
      status: 'pending'
    });

    await Notification.create({
      user: req.user._id,
      title: 'উইথড্র আবেদন পাঠানো হয়েছে',
      message: `${amount} টাকার উইথড্র রিকুয়েস্ট পাঠানো হয়েছে। অ্যাডমিন প্রসেস করবেন।`,
      type: 'info', icon: 'account_balance_wallet'
    });

    res.status(201).json({ success: true, message: 'উইথড্র আবেদন পাঠানো হয়েছে!', transaction: { id: txn._id, receiptNo: txn.receiptNo, amount: txn.amount, status: txn.status } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// GET /api/transaction/history
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = { user: req.user._id };
    if (type) query.type = type;

    const total = await Transaction.countDocuments(query);
    const txns = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, transactions: txns, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

module.exports = router;

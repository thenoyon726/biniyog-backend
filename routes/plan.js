const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// GET /api/plans - সব প্ল্যান দেখো
router.get('/', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// POST /api/plans/invest - বিনিয়োগ করো
router.post('/invest', protect, async (req, res) => {
  try {
    const { planId, amount } = req.body;
    const user = await User.findById(req.user._id);
    const plan = await Plan.findById(planId);

    if (!plan || !plan.isActive) return res.status(404).json({ success: false, message: 'প্ল্যান পাওয়া যায়নি।' });
    if (amount < plan.minAmount) return res.status(400).json({ success: false, message: `সর্বনিম্ন বিনিয়োগ ৳${plan.minAmount}` });
    if (amount > plan.maxAmount) return res.status(400).json({ success: false, message: `সর্বোচ্চ বিনিয়োগ ৳${plan.maxAmount}` });
    if (user.balance < amount) return res.status(400).json({ success: false, message: `পর্যাপ্ত ব্যালেন্স নেই। বর্তমান: ৳${user.balance}` });

    // Deduct from balance
    user.balance -= parseFloat(amount);
    await user.save({ validateBeforeSave: false });

    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + plan.durationDays);

    const dailyReturn = (amount * plan.returnRate) / 100;
    const totalReturn = (amount * plan.totalReturn) / 100;

    // Create investment transaction
    const txn = await Transaction.create({
      user: req.user._id,
      type: 'investment',
      amount: parseFloat(amount),
      status: 'completed',
      plan: plan._id,
      planName: plan.name,
      profitRate: plan.totalReturn,
      durationDays: plan.durationDays,
      maturityDate,
      paymentMethod: 'system'
    });

    // Create investment record
    const inv = await Investment.create({
      user: req.user._id,
      plan: plan._id,
      planName: plan.name,
      amount: parseFloat(amount),
      dailyReturn,
      totalReturn,
      returnRate: plan.totalReturn,
      durationDays: plan.durationDays,
      maturityDate,
      transaction: txn._id
    });

    // Update plan investor count
    plan.totalInvestors += 1;
    await plan.save();

    await Notification.create({
      user: req.user._id,
      title: 'বিনিয়োগ সফল!',
      message: `${plan.name} প্ল্যানে ৳${amount} বিনিয়োগ করা হয়েছে। ${plan.durationDays} দিনে মোট মুনাফা ৳${totalReturn.toFixed(0)}।`,
      type: 'success', icon: 'trending_up'
    });

    res.status(201).json({ success: true, message: 'বিনিয়োগ সফল হয়েছে!', investment: { id: inv._id, planName: plan.name, amount, dailyReturn, totalReturn, maturityDate } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

// GET /api/plans/my-investments
router.get('/my-investments', protect, async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('plan', 'name icon color');
    res.json({ success: true, investments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});

module.exports = router;

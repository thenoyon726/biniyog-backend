const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// ── Middleware ─────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['https://biniyog-backend.vercel.app', 'https://adminreportonline.online', 'https://www.adminreportonline.online', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, message: 'অনেক বেশি রিকুয়েস্ট। একটু পর চেষ্টা করুন।' } });
app.use('/api/auth', limiter);

// Public settings
app.get('/api/settings', async (req, res) => {
  try {
    const Setting = require('./models/Setting');
    let settings = await Setting.findOne();
    if (!settings) settings = { bkashNumber: '', nagadNumber: '', rocketNumber: '' };
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।' });
  }
});
// ── Static Files ────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ──────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/plans', require('./routes/plan'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));

// ── Health Check ────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'বিনিয়োগ অ্যাপ সার্ভার চালু আছে! 🚀', version: '2.0.0', time: new Date() });
});

// ── Frontend SPA Fallback ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'login.html'));
});

// ── Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'সার্ভার সমস্যা!' });
});

// ── Daily Profit Cron Job (রাত ১২টায়) ──────────
const runDailyProfits = async () => {
  try {
    const Investment = require('./models/Investment');
    const User = require('./models/User');
    const Transaction = require('./models/Transaction');
    const Notification = require('./models/Notification');

    const activeInvestments = await Investment.find({ status: 'active' });
    const now = new Date();

    for (const inv of activeInvestments) {
      // Check if matured
      if (now >= inv.maturityDate) {
        // Return principal + profit to user
        const totalPayout = inv.amount + inv.totalReturn;
        await User.findByIdAndUpdate(inv.user, {
          $inc: { balance: totalPayout, totalProfit: inv.totalReturn }
        });
        inv.status = 'completed';
        inv.daysCompleted = inv.durationDays;
        inv.profitPaid = inv.totalReturn;
        await inv.save();

        await Transaction.create({ user: inv.user, type: 'profit', amount: totalPayout, status: 'completed', planName: inv.planName, paymentMethod: 'system', adminNote: 'বিনিয়োগ মেয়াদ শেষ - মূলধন + মুনাফা ফেরত' });
        await Notification.create({ user: inv.user, title: 'বিনিয়োগ সম্পন্ন! 🎉', message: `${inv.planName} প্ল্যানের মেয়াদ শেষ। ৳${totalPayout.toFixed(0)} (মূলধন + মুনাফা) ব্যালেন্সে যোগ হয়েছে।`, type: 'success', icon: 'emoji_events' });
      } else {
        // Add daily profit
        const daysSinceStart = Math.floor((now - inv.startDate) / (1000 * 60 * 60 * 24));
        if (daysSinceStart > inv.daysCompleted) {
          await User.findByIdAndUpdate(inv.user, { $inc: { balance: inv.dailyReturn, totalProfit: inv.dailyReturn } });
          inv.daysCompleted = daysSinceStart;
          inv.profitPaid += inv.dailyReturn;
          await inv.save();
        }
      }
    }
    console.log(`✅ দৈনিক মুনাফা প্রসেস হয়েছে - ${activeInvestments.length}টি বিনিয়োগ।`);
  } catch (err) {
    console.error('Cron Error:', err.message);
  }
};

// রাত ১২:০১ মিনিটে চালাও প্রতিদিন
cron.schedule('1 0 * * *', runDailyProfits, { timezone: 'Asia/Dhaka' });

// ── MongoDB Connect ──────────────────────────────
const PORT = process.env.PORT || 5000;

// ── MongoDB Connect + Export ──────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  maxPoolSize: 10
})
  .then(() => console.log('✅ MongoDB সংযুক্ত!'))
  .catch((err) => console.error('❌ MongoDB সংযোগ ব্যর্থ:', err.message));

// Vercel এর জন্য export
module.exports = app;

// Local development এর জন্য
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 সার্ভার চালু: http://localhost:${PORT}`));
}

const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  planName: String,
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dailyReturn: Number,    // daily profit amount in BDT
  totalReturn: Number,    // total profit amount expected
  returnRate: Number,     // % rate
  durationDays: Number,
  startDate: {
    type: Date,
    default: Date.now
  },
  maturityDate: Date,
  profitPaid: {
    type: Number,
    default: 0
  },
  daysCompleted: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Investment', investmentSchema);

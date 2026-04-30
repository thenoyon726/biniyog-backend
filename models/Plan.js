const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameEn: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  minAmount: {
    type: Number,
    required: true,
    min: 0
  },
  maxAmount: {
    type: Number,
    required: true
  },
  returnRate: {
    type: Number,   // daily return % e.g. 1.5 = 1.5% per day
    required: true
  },
  durationDays: {
    type: Number,   // e.g. 30 days
    required: true
  },
  totalReturn: {
    type: Number,   // total % return e.g. 45% in 30 days
    required: true
  },
  icon: {
    type: String,
    default: '💰'
  },
  color: {
    type: String,
    default: '#1a9e2e'
  },
  badge: {
    type: String,   // e.g. "জনপ্রিয়", "প্রিমিয়াম"
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  totalInvestors: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Plan', planSchema);

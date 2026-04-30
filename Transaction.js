const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'profit', 'investment', 'referral', 'refund'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  // Payment Method Info
  paymentMethod: {
    type: String,
    enum: ['bkash', 'nagad', 'rocket', 'bank', 'system'],
    default: 'bkash'
  },
  senderNumber: {
    type: String,
    default: null
  },
  transactionId: {
    type: String,
    default: null   // bKash/Nagad TrxID
  },
  // For investment type
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    default: null
  },
  planName: {
    type: String,
    default: null
  },
  profitRate: {
    type: Number,
    default: null
  },
  durationDays: {
    type: Number,
    default: null
  },
  maturityDate: {
    type: Date,
    default: null
  },
  // Admin notes
  adminNote: {
    type: String,
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  // Receipt number
  receiptNo: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate receipt number before save
transactionSchema.pre('save', function(next) {
  if (!this.receiptNo) {
    const prefix = this.type === 'deposit' ? 'DEP' :
                   this.type === 'withdraw' ? 'WTH' :
                   this.type === 'profit' ? 'PRF' :
                   this.type === 'investment' ? 'INV' : 'TXN';
    this.receiptNo = prefix + Date.now() + Math.floor(Math.random() * 1000);
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);

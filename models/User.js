const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'নাম দেওয়া আবশ্যক'],
    trim: true,
    maxlength: [100, 'নাম ১০০ অক্ষরের বেশি হবে না']
  },
  mobile: {
    type: String,
    required: [true, 'মোবাইল নম্বর দেওয়া আবশ্যক'],
    unique: true,
    match: [/^(\+88)?01[3-9]\d{8}$/, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন']
  },
  password: {
    type: String,
    required: [true, 'পাসওয়ার্ড দেওয়া আবশ্যক'],
    minlength: [6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDeposit: {
    type: Number,
    default: 0
  },
  totalWithdraw: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  // KYC Info
  nidNumber: {
    type: String,
    default: null
  },
  bkashNumber: {
    type: String,
    default: null
  },
  nagadNumber: {
    type: String,
    default: null
  },
  // Referral System
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
referralEarnings: {
    type: Number,
    default: 0
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referralBonusUsed: {
    type: Number,
    default: 0
  },
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Password হ্যাশ করো
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // Referral code generate করো
  if (!this.referralCode) {
    this.referralCode = 'BIN' + Math.random().toString(36).substring(2, 7).toUpperCase();
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

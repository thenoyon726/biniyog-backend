require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Plan = require('../models/Plan');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB সংযুক্ত');

    // Create Admin
    const existing = await User.findOne({ mobile: process.env.ADMIN_MOBILE });
    if (!existing) {
      await User.create({
        name: process.env.ADMIN_NAME || 'সিস্টেম অ্যাডমিন',
        mobile: process.env.ADMIN_MOBILE || '01700000000',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
        role: 'admin',
        isActive: true,
        isVerified: true
      });
      console.log('✅ অ্যাডমিন অ্যাকাউন্ট তৈরি হয়েছে');
    } else {
      console.log('ℹ️  অ্যাডমিন আগেই আছে');
    }

    // Create Default Plans
    const planCount = await Plan.countDocuments();
    if (planCount === 0) {
      await Plan.insertMany([
        {
          name: 'স্টার্টার প্ল্যান',
          nameEn: 'Starter Plan',
          description: 'নতুনদের জন্য আদর্শ বিনিয়োগ। কম ঝুঁকিতে নিশ্চিত মুনাফা।',
          minAmount: 500,
          maxAmount: 9999,
          returnRate: 1.5,
          durationDays: 30,
          totalReturn: 45,
          icon: '🌱',
          color: '#4caf50',
          badge: null,
          sortOrder: 1
        },
        {
          name: 'গ্রোথ প্ল্যান',
          nameEn: 'Growth Plan',
          description: 'মধ্যম বিনিয়োগকারীদের জন্য উচ্চ রিটার্ন প্ল্যান।',
          minAmount: 10000,
          maxAmount: 49999,
          returnRate: 2.0,
          durationDays: 30,
          totalReturn: 60,
          icon: '📈',
          color: '#2196f3',
          badge: 'জনপ্রিয়',
          sortOrder: 2
        },
        {
          name: 'প্রিমিয়াম প্ল্যান',
          nameEn: 'Premium Plan',
          description: 'বড় বিনিয়োগকারীদের জন্য সর্বোচ্চ রিটার্ন।',
          minAmount: 50000,
          maxAmount: 500000,
          returnRate: 2.5,
          durationDays: 30,
          totalReturn: 75,
          icon: '👑',
          color: '#fdc003',
          badge: 'প্রিমিয়াম',
          sortOrder: 3
        },
        {
          name: 'ডায়মন্ড প্ল্যান',
          nameEn: 'Diamond Plan',
          description: '৬০ দিনের দীর্ঘমেয়াদি বিনিয়োগ, সর্বোচ্চ রিটার্ন।',
          minAmount: 100000,
          maxAmount: 1000000,
          returnRate: 2.0,
          durationDays: 60,
          totalReturn: 120,
          icon: '💎',
          color: '#9c27b0',
          badge: 'এক্সক্লুসিভ',
          sortOrder: 4
        }
      ]);
      console.log('✅ ডিফল্ট প্ল্যান তৈরি হয়েছে (৪টি)');
    } else {
      console.log('ℹ️  প্ল্যান আগেই আছে');
    }

    console.log('\n🎉 সিড সম্পন্ন!');
    console.log(`📱 অ্যাডমিন মোবাইল: ${process.env.ADMIN_MOBILE || '01700000000'}`);
    console.log(`🔑 অ্যাডমিন পাসওয়ার্ড: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Error:', err.message);
    process.exit(1);
  }
};

seed();

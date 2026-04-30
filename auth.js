const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'অনুমতি নেই। আগে লগইন করুন।' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'ইউজার খুঁজে পাওয়া যায়নি।' });
    }
    if (!req.user.isActive) {
      return res.status(403).json({ success: false, message: 'অ্যাকাউন্ট নিষ্ক্রিয়।' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'টোকেন মেয়াদ শেষ। আবার লগইন করুন।' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'শুধুমাত্র অ্যাডমিন এক্সেস।' });
};

module.exports = { protect, adminOnly };

const mongoose = require('mongoose');
 
const settingSchema = new mongoose.Schema({
  bkashNumber:  { type: String, default: '' },
  nagadNumber:  { type: String, default: '' },
  rocketNumber: { type: String, default: '' },
  minDeposit:   { type: Number, default: 500 },
  minWithdraw:  { type: Number, default: 500 },
}, { timestamps: true });
 
module.exports = mongoose.model('Setting', settingSchema);

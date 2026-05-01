const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['user', 'admin'], required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [messageSchema],
  isOpen: { type: Boolean, default: true },
  lastMessage: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);

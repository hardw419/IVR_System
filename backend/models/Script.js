const mongoose = require('mongoose');

const scriptSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  systemPrompt: {
    type: String,
    required: true,
    default: 'You are a professional sales representative calling on behalf of a company in Belgium.'
  },
  variables: [{
    key: String,
    description: String,
    defaultValue: String
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['sales', 'support', 'survey', 'appointment', 'custom'],
    default: 'custom'
  },
  language: {
    type: String,
    default: 'nl-BE' // Dutch (Belgium)
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

scriptSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Script', scriptSchema);


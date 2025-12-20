const mongoose = require('mongoose');

const voiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  provider: {
    type: String,
    enum: ['openai', 'elevenlabs', 'azure', 'google'],
    default: 'openai'
  },
  voiceId: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'nl-BE'
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'neutral'],
    default: 'neutral'
  },
  description: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  settings: {
    speed: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 2.0
    },
    pitch: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 2.0
    },
    stability: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Voice', voiceSchema);


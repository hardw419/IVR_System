const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Script',
    required: true
  },
  voiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voice',
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['queued', 'initiated', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy', 'transferred'],
    default: 'queued'
  },
  callSid: {
    type: String,
    unique: true,
    sparse: true
  },
  vapiCallId: {
    type: String
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  recording: {
    url: String,
    duration: Number
  },
  transcript: {
    type: String
  },
  transcriptMessages: [{
    role: {
      type: String,
      enum: ['assistant', 'user', 'system', 'bot', 'ai', 'customer', 'human', 'tool', 'function', 'tool_call', 'tool_result']
    },
    message: String,
    timestamp: Date
  }],
  summary: {
    type: String
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative']
  },
  keyPressed: {
    type: String,
    enum: ['1', '2', 'none'],
    default: 'none'
  },
  transferredTo: {
    type: String
  },
  cost: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: String
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

callSchema.index({ userId: 1, createdAt: -1 });
callSchema.index({ status: 1 });
callSchema.index({ callSid: 1 });

module.exports = mongoose.model('Call', callSchema);


const mongoose = require('mongoose');

const callQueueSchema = new mongoose.Schema({
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call'
  },
  vapiCallId: {
    type: String
  },
  twilioCallSid: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerName: {
    type: String
  },
  keyPressed: {
    type: String,
    default: '1'
  },
  status: {
    type: String,
    enum: ['waiting', 'ringing', 'answered', 'completed', 'abandoned', 'timeout'],
    default: 'waiting'
  },
  priority: {
    type: Number,
    default: 0 // Higher = more priority
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  waitStartTime: {
    type: Date,
    default: Date.now
  },
  answerTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  waitDuration: {
    type: Number // in seconds
  },
  callDuration: {
    type: Number // in seconds
  },
  notes: {
    type: String
  }
});

// Index for efficient queries
callQueueSchema.index({ userId: 1, status: 1, waitStartTime: 1 });
callQueueSchema.index({ vapiCallId: 1 });
callQueueSchema.index({ twilioCallSid: 1 });

module.exports = mongoose.model('CallQueue', callQueueSchema);


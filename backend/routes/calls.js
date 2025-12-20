const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Call = require('../models/Call');
const Script = require('../models/Script');
const Voice = require('../models/Voice');
const Campaign = require('../models/Campaign');
const Agent = require('../models/Agent');
const { auth } = require('../middleware/auth');
const vapiService = require('../services/vapiService');

// Configure multer for CSV upload
const upload = multer({ dest: 'uploads/' });

// @route   GET /api/calls
// @desc    Get all calls for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = { userId: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const calls = await Call.find(query)
      .populate('scriptId', 'name')
      .populate('voiceId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Call.countDocuments(query);

    res.json({
      success: true,
      calls,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/calls/:id
// @desc    Get single call details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const call = await Call.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
    .populate('scriptId')
    .populate('voiceId');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    res.json({
      success: true,
      call
    });
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/calls/:id/transcript
// @desc    Get or refresh call transcript from Vapi
// @access  Private
router.get('/:id/transcript', auth, async (req, res) => {
  try {
    const call = await Call.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // If we have a Vapi call ID, try to fetch latest transcript
    if (call.vapiCallId) {
      try {
        const vapiData = await vapiService.getCallTranscript(call.vapiCallId);

        // Update call with latest data
        if (vapiData.transcript) {
          call.transcript = vapiData.transcript;
        }
        if (vapiData.messages && vapiData.messages.length > 0) {
          call.transcriptMessages = vapiData.messages.map(msg => ({
            role: msg.role,
            message: msg.content || msg.message,
            timestamp: msg.time ? new Date(msg.time) : new Date()
          }));
        }
        if (vapiData.recordingUrl) {
          call.recording = {
            url: vapiData.recordingUrl,
            duration: vapiData.duration || call.duration
          };
        }
        if (vapiData.summary) {
          call.summary = vapiData.summary;
        }
        // Update duration and status from Vapi
        if (vapiData.duration) {
          call.duration = Math.round(vapiData.duration);
        }
        if (vapiData.status) {
          // Map Vapi status to our status
          const statusMap = {
            'ended': 'completed',
            'completed': 'completed',
            'finished': 'completed',
            'answered': 'completed',
            'failed': 'failed',
            'busy': 'failed',
            'no-answer': 'failed',
            'canceled': 'failed',
            'cancelled': 'failed',
            'in-progress': 'in-progress',
            'ringing': 'in-progress',
            'queued': 'queued',
            'initiated': 'initiated'
          };
          const newStatus = statusMap[vapiData.status] || vapiData.status;
          console.log(`Mapping status: ${vapiData.status} -> ${newStatus}`);
          call.status = newStatus;
        }

        await call.save();
      } catch (vapiError) {
        console.error('Error fetching from Vapi:', vapiError.message);
        // Continue with existing data
      }
    }

    res.json({
      success: true,
      transcript: call.transcript,
      transcriptMessages: call.transcriptMessages,
      recording: call.recording,
      summary: call.summary,
      duration: call.duration
    });
  } catch (error) {
    console.error('Get transcript error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/calls/sync
// @desc    Sync all calls with Vapi to update status and duration
// @access  Private
router.post('/sync', auth, async (req, res) => {
  try {
    // Find all calls that are not in a final state
    const calls = await Call.find({
      userId: req.user._id,
      vapiCallId: { $exists: true, $ne: null },
      status: { $in: ['initiated', 'in-progress', 'queued'] }
    });

    let updated = 0;
    for (const call of calls) {
      try {
        const vapiData = await vapiService.getCallTranscript(call.vapiCallId);

        if (vapiData.duration) {
          call.duration = Math.round(vapiData.duration);
        }
        if (vapiData.status) {
          const statusMap = {
            'ended': 'completed',
            'completed': 'completed',
            'finished': 'completed',
            'answered': 'completed',
            'failed': 'failed',
            'busy': 'failed',
            'no-answer': 'failed',
            'canceled': 'failed',
            'cancelled': 'failed',
            'in-progress': 'in-progress',
            'ringing': 'in-progress',
            'queued': 'queued'
          };
          const newStatus = statusMap[vapiData.status] || vapiData.status;
          console.log(`Sync - Mapping status for call ${call._id}: ${vapiData.status} -> ${newStatus}`);
          call.status = newStatus;
        }
        if (vapiData.transcript) {
          call.transcript = vapiData.transcript;
        }
        if (vapiData.messages && vapiData.messages.length > 0) {
          call.transcriptMessages = vapiData.messages.map(msg => ({
            role: msg.role,
            message: msg.content || msg.message,
            timestamp: msg.time ? new Date(msg.time) : new Date()
          }));
        }
        if (vapiData.recordingUrl) {
          call.recording = {
            url: vapiData.recordingUrl,
            duration: vapiData.duration || call.duration
          };
        }

        await call.save();
        updated++;
      } catch (err) {
        console.error(`Error syncing call ${call._id}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Synced ${updated} of ${calls.length} calls`,
      updated
    });
  } catch (error) {
    console.error('Sync calls error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/calls/single
// @desc    Initiate a single call
// @access  Private
router.post('/single', [
  auth,
  body('customerPhone').trim().notEmpty().withMessage('Customer phone is required'),
  body('scriptId').notEmpty().withMessage('Script ID is required'),
  body('voiceId').notEmpty().withMessage('Voice ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { customerPhone, customerName, scriptId, voiceId, metadata } = req.body;

    // Verify script and voice belong to user
    const script = await Script.findOne({ _id: scriptId, userId: req.user._id });
    const voice = await Voice.findOne({ _id: voiceId, userId: req.user._id });

    if (!script || !voice) {
      return res.status(404).json({
        success: false,
        message: 'Script or Voice not found'
      });
    }

    // Fetch available agents for call transfer
    const agents = await Agent.find({ userId: req.user._id });

    // Create call record
    const call = new Call({
      userId: req.user._id,
      scriptId,
      voiceId,
      customerPhone,
      customerName,
      metadata,
      status: 'queued'
    });

    await call.save();

    // Initiate call via Vapi
    try {
      const vapiCall = await vapiService.createPhoneCall({
        customerPhone,
        script,
        voice,
        agents, // Pass agents for transfer configuration
        assistantConfig: {
          firstMessage: script.content.split('\n')[0] || 'Hello!'
        }
      });

      call.vapiCallId = vapiCall.id;
      call.status = 'initiated';
      call.startTime = new Date();
      await call.save();

      res.status(201).json({
        success: true,
        message: 'Call initiated successfully',
        call
      });
    } catch (vapiError) {
      call.status = 'failed';
      await call.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to initiate call',
        error: vapiError.message
      });
    }
  } catch (error) {
    console.error('Single call error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/calls/bulk
// @desc    Initiate bulk calls from CSV
// @access  Private
router.post('/bulk', [auth, upload.single('csvFile')], async (req, res) => {
  try {
    const { scriptId, voiceId, campaignName } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    // Verify script and voice
    const script = await Script.findOne({ _id: scriptId, userId: req.user._id });
    const voice = await Voice.findOne({ _id: voiceId, userId: req.user._id });

    if (!script || !voice) {
      return res.status(404).json({
        success: false,
        message: 'Script or Voice not found'
      });
    }

    // Parse CSV
    const contacts = [];
    const filePath = req.file.path;

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (row.phone || row.Phone || row.phoneNumber) {
            contacts.push({
              name: row.name || row.Name || '',
              phone: row.phone || row.Phone || row.phoneNumber,
              metadata: row
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Delete uploaded file
    fs.unlinkSync(filePath);

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid contacts found in CSV'
      });
    }

    // Create campaign
    const campaign = new Campaign({
      name: campaignName || `Bulk Call - ${new Date().toISOString()}`,
      userId: req.user._id,
      scriptId,
      voiceId,
      contacts,
      status: 'running'
    });

    await campaign.save();

    // Create call records and initiate calls
    const callPromises = contacts.map(async (contact) => {
      const call = new Call({
        userId: req.user._id,
        scriptId,
        voiceId,
        customerPhone: contact.phone,
        customerName: contact.name,
        metadata: contact.metadata,
        status: 'queued'
      });

      await call.save();

      // Initiate call (with delay to avoid rate limiting)
      setTimeout(async () => {
        try {
          const vapiCall = await vapiService.createPhoneCall({
            customerPhone: contact.phone,
            script,
            voice,
            assistantConfig: {
              firstMessage: script.content.split('\n')[0] || 'Hello!'
            }
          });

          call.vapiCallId = vapiCall.id;
          call.status = 'initiated';
          call.startTime = new Date();
          await call.save();

          campaign.callsCompleted++;
          campaign.callsSuccessful++;
          await campaign.save();
        } catch (error) {
          call.status = 'failed';
          await call.save();

          campaign.callsCompleted++;
          campaign.callsFailed++;
          await campaign.save();
        }
      }, contacts.indexOf(contact) * 2000); // 2 second delay between calls

      return call;
    });

    await Promise.all(callPromises);

    res.status(201).json({
      success: true,
      message: `Bulk call campaign created with ${contacts.length} contacts`,
      campaign,
      contactCount: contacts.length
    });
  } catch (error) {
    console.error('Bulk call error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/calls/campaigns
// @desc    Get all campaigns
// @access  Private
router.get('/campaigns/list', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.user._id })
      .populate('scriptId', 'name')
      .populate('voiceId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/calls/stats
// @desc    Get call statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const totalCalls = await Call.countDocuments({ userId: req.user._id });
    const completedCalls = await Call.countDocuments({ userId: req.user._id, status: 'completed' });
    const failedCalls = await Call.countDocuments({ userId: req.user._id, status: 'failed' });
    const inProgressCalls = await Call.countDocuments({ userId: req.user._id, status: 'in-progress' });

    const totalDuration = await Call.aggregate([
      { $match: { userId: req.user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalCalls,
        completedCalls,
        failedCalls,
        inProgressCalls,
        totalDuration: totalDuration[0]?.total || 0,
        averageDuration: completedCalls > 0 ? (totalDuration[0]?.total || 0) / completedCalls : 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

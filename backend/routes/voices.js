const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Voice = require('../models/Voice');
const { auth } = require('../middleware/auth');

// @route   GET /api/voices
// @desc    Get all voices for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const voices = await Voice.find({ userId: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 });
    
    res.json({
      success: true,
      count: voices.length,
      voices
    });
  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/voices/:id
// @desc    Get single voice
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const voice = await Voice.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!voice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Voice not found' 
      });
    }

    res.json({
      success: true,
      voice
    });
  } catch (error) {
    console.error('Get voice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/voices
// @desc    Create a new voice configuration
// @access  Private
router.post('/', [
  auth,
  body('name').trim().notEmpty().withMessage('Voice name is required'),
  body('voiceId').trim().notEmpty().withMessage('Voice ID is required'),
  body('provider').optional().isIn(['openai', 'elevenlabs', 'azure', 'google'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, provider, voiceId, language, gender, description, isDefault, settings } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await Voice.updateMany(
        { userId: req.user._id },
        { isDefault: false }
      );
    }

    const voice = new Voice({
      name,
      provider,
      voiceId,
      language,
      gender,
      description,
      isDefault,
      settings,
      userId: req.user._id
    });

    await voice.save();

    res.status(201).json({
      success: true,
      message: 'Voice created successfully',
      voice
    });
  } catch (error) {
    console.error('Create voice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/voices/:id
// @desc    Update a voice
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let voice = await Voice.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!voice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Voice not found' 
      });
    }

    const { name, provider, voiceId, language, gender, description, isDefault, settings } = req.body;

    // If setting as default, unset other defaults
    if (isDefault && !voice.isDefault) {
      await Voice.updateMany(
        { userId: req.user._id, _id: { $ne: voice._id } },
        { isDefault: false }
      );
    }

    if (name) voice.name = name;
    if (provider) voice.provider = provider;
    if (voiceId) voice.voiceId = voiceId;
    if (language) voice.language = language;
    if (gender) voice.gender = gender;
    if (description !== undefined) voice.description = description;
    if (isDefault !== undefined) voice.isDefault = isDefault;
    if (settings) voice.settings = { ...voice.settings, ...settings };

    await voice.save();

    res.json({
      success: true,
      message: 'Voice updated successfully',
      voice
    });
  } catch (error) {
    console.error('Update voice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/voices/:id
// @desc    Delete a voice
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const voice = await Voice.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!voice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Voice not found' 
      });
    }

    res.json({
      success: true,
      message: 'Voice deleted successfully'
    });
  } catch (error) {
    console.error('Delete voice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;


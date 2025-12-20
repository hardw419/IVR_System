const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Script = require('../models/Script');
const { auth } = require('../middleware/auth');

// @route   GET /api/scripts
// @desc    Get all scripts for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const scripts = await Script.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: scripts.length,
      scripts
    });
  } catch (error) {
    console.error('Get scripts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/scripts/:id
// @desc    Get single script
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const script = await Script.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!script) {
      return res.status(404).json({ 
        success: false, 
        message: 'Script not found' 
      });
    }

    res.json({
      success: true,
      script
    });
  } catch (error) {
    console.error('Get script error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/scripts
// @desc    Create a new script
// @access  Private
router.post('/', [
  auth,
  body('name').trim().notEmpty().withMessage('Script name is required'),
  body('content').trim().notEmpty().withMessage('Script content is required'),
  body('systemPrompt').optional().trim(),
  body('category').optional().isIn(['sales', 'support', 'survey', 'appointment', 'custom'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, content, systemPrompt, variables, category, language } = req.body;

    const script = new Script({
      name,
      description,
      content,
      systemPrompt,
      variables,
      category,
      language,
      userId: req.user._id
    });

    await script.save();

    res.status(201).json({
      success: true,
      message: 'Script created successfully',
      script
    });
  } catch (error) {
    console.error('Create script error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/scripts/:id
// @desc    Update a script
// @access  Private
router.put('/:id', [
  auth,
  body('name').optional().trim().notEmpty(),
  body('content').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let script = await Script.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!script) {
      return res.status(404).json({ 
        success: false, 
        message: 'Script not found' 
      });
    }

    const { name, description, content, systemPrompt, variables, category, language, isActive } = req.body;

    if (name) script.name = name;
    if (description !== undefined) script.description = description;
    if (content) script.content = content;
    if (systemPrompt) script.systemPrompt = systemPrompt;
    if (variables) script.variables = variables;
    if (category) script.category = category;
    if (language) script.language = language;
    if (isActive !== undefined) script.isActive = isActive;

    await script.save();

    res.json({
      success: true,
      message: 'Script updated successfully',
      script
    });
  } catch (error) {
    console.error('Update script error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/scripts/:id
// @desc    Delete a script
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const script = await Script.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!script) {
      return res.status(404).json({ 
        success: false, 
        message: 'Script not found' 
      });
    }

    res.json({
      success: true,
      message: 'Script deleted successfully'
    });
  } catch (error) {
    console.error('Delete script error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;


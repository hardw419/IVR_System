const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Agent = require('../models/Agent');
const { auth } = require('../middleware/auth');

// @route   GET /api/agents
// @desc    Get all agents for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const agents = await Agent.find({ userId: req.user._id })
      .sort({ keyPress: 1 });
    
    res.json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/agents
// @desc    Create a new agent
// @access  Private
router.post('/', [
  auth,
  body('name').trim().notEmpty().withMessage('Agent name is required'),
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  body('keyPress').isIn(['1', '2']).withMessage('Key press must be 1 or 2')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, phoneNumber, keyPress, email, department, isAvailable } = req.body;

    // Check if keyPress is already assigned
    const existingAgent = await Agent.findOne({ 
      userId: req.user._id, 
      keyPress 
    });

    if (existingAgent) {
      return res.status(400).json({ 
        success: false, 
        message: `Key ${keyPress} is already assigned to ${existingAgent.name}` 
      });
    }

    const agent = new Agent({
      name,
      phoneNumber,
      keyPress,
      email,
      department,
      isAvailable,
      userId: req.user._id
    });

    await agent.save();

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/agents/:id
// @desc    Update an agent
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let agent = await Agent.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not found' 
      });
    }

    const { name, phoneNumber, keyPress, email, department, isAvailable } = req.body;

    // If changing keyPress, check if it's already assigned
    if (keyPress && keyPress !== agent.keyPress) {
      const existingAgent = await Agent.findOne({ 
        userId: req.user._id, 
        keyPress,
        _id: { $ne: agent._id }
      });

      if (existingAgent) {
        return res.status(400).json({ 
          success: false, 
          message: `Key ${keyPress} is already assigned to ${existingAgent.name}` 
        });
      }
    }

    if (name) agent.name = name;
    if (phoneNumber) agent.phoneNumber = phoneNumber;
    if (keyPress) agent.keyPress = keyPress;
    if (email !== undefined) agent.email = email;
    if (department !== undefined) agent.department = department;
    if (isAvailable !== undefined) agent.isAvailable = isAvailable;

    await agent.save();

    res.json({
      success: true,
      message: 'Agent updated successfully',
      agent
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/agents/:id
// @desc    Delete an agent
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const agent = await Agent.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not found' 
      });
    }

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;


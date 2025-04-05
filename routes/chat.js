const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get chat history with a friend
router.get('/history/:friendId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const friend = await User.findById(req.params.friendId);

    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Check if they are friends
    if (!user.friends.includes(friend._id)) {
      return res.status(403).json({ message: 'Not authorized to chat with this user' });
    }

    // In a real application, you would fetch messages from a Message model
    // For now, we'll return a success response
    res.json({ message: 'Chat history retrieved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat history', error: error.message });
  }
});

// Send a message
router.post('/send/:friendId', auth, async (req, res) => {
  try {
    const { message, type = 'text' } = req.body;
    const user = await User.findById(req.user.userId);
    const friend = await User.findById(req.params.friendId);

    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Check if they are friends
    if (!user.friends.includes(friend._id)) {
      return res.status(403).json({ message: 'Not authorized to chat with this user' });
    }

    // In a real application, you would save the message to a Message model
    // For now, we'll return a success response
    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

// Send a code snippet
router.post('/code/:friendId', auth, async (req, res) => {
  try {
    const { code, language } = req.body;
    const user = await User.findById(req.user.userId);
    const friend = await User.findById(req.params.friendId);

    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Check if they are friends
    if (!user.friends.includes(friend._id)) {
      return res.status(403).json({ message: 'Not authorized to chat with this user' });
    }

    // In a real application, you would save the code snippet to a Message model
    // with type 'code' and the language specified
    res.json({ message: 'Code snippet sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending code snippet', error: error.message });
  }
});

module.exports = router; 
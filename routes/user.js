const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('friends', 'name userId')
      .populate('friendRequests.from', 'name userId');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// Send friend request
router.post('/friend-request/:userId', auth, async (req, res) => {
  try {
    const recipient = await User.findOne({ userId: req.params.userId });
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if request already exists
    const existingRequest = recipient.friendRequests.find(
      request => request.from.toString() === req.user.userId
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Add friend request
    recipient.friendRequests.push({
      from: req.user.userId,
      status: 'pending'
    });

    await recipient.save();
    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending friend request', error: error.message });
  }
});

// Accept friend request
router.post('/friend-request/accept/:requestId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const request = user.friendRequests.id(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request already processed' });
    }

    // Update request status
    request.status = 'accepted';

    // Add to friends list for both users
    user.friends.push(request.from);
    await user.save();

    const friend = await User.findById(request.from);
    friend.friends.push(user._id);
    await friend.save();

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting friend request', error: error.message });
  }
});

// Reject friend request
router.post('/friend-request/reject/:requestId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const request = user.friendRequests.id(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request already processed' });
    }

    request.status = 'rejected';
    await user.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting friend request', error: error.message });
  }
});

// Get friend list
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('friends', 'name userId');
    
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching friends', error: error.message });
  }
});

// Get pending friend requests
router.get('/friend-requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('friendRequests.from', 'name userId');
    
    const pendingRequests = user.friendRequests.filter(
      request => request.status === 'pending'
    );
    
    res.json(pendingRequests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching friend requests', error: error.message });
  }
});

module.exports = router; 
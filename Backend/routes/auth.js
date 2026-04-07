const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/join', async (req, res) => {
  const { username } = req.body;

  if (!username || username.trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters' });
  }

  try {
    let user = await User.findOne({ username: username.trim() });

    if (!user) {
      const colors = ['#7c6dfa', '#fa6d8a', '#6dfabd', '#facc6d', '#fa9b6d'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      user = await User.create({ username: username.trim(), color });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
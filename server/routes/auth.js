const express = require('express');
const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) return next();
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
};

router.post('/doctor/login', (req, res) => {
  if (req.body.password === process.env.DASHBOARD_PASSWORD) {
    req.session.isAuthenticated = true;
    res.status(200).json({ message: 'Login successful.' });
  } else {
    res.status(401).json({ error: 'Invalid password.' });
  }
});

router.get('/doctor/check-auth', (req, res) => {
  res.status(200).json({ isAuthenticated: !!(req.session && req.session.isAuthenticated) });
});

router.post('/doctor/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ error: 'Could not log out.' });
      res.clearCookie('connect.sid').status(200).json({ message: 'Logout successful.' });
    });
  } else {
    res.status(200).json({ message: 'No active session.' });
  }
});

module.exports = { router, ensureAuthenticated };

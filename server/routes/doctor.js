const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');
const { ensureAuthenticated } = require('./auth');

router.get('/doctor/patients', ensureAuthenticated, async (req, res) => {
  try {
    const assessments = await Assessment.find({}, 'demographics.fullName demographics.email').lean();
    const patientsMap = new Map();
    assessments.forEach(a => {
      if (a.demographics && a.demographics.email && !patientsMap.has(a.demographics.email)) {
        patientsMap.set(a.demographics.email, { id: a.demographics.email, name: a.demographics.fullName });
      }
    });
    res.status(200).json(Array.from(patientsMap.values()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve patient list.' });
  }
});

router.get('/doctor/patient/:email/assessments', ensureAuthenticated, async (req, res) => {
  try {
    const assessments = await Assessment.find({ 'demographics.email': req.params.email }).sort({ createdAt: -1 });
    res.status(200).json(assessments || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve assessments.' });
  }
});

router.delete('/doctor/assessment/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Assessment.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }
    res.status(200).json({ message: 'Assessment deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete assessment.' });
  }
});

router.delete('/doctor/user/:email', ensureAuthenticated, async (req, res) => {
  try {
    const { email } = req.params;
    const result = await Assessment.deleteMany({ 'demographics.email': email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'No assessments found for this user.' });
    }
    res.status(200).json({ message: `${result.deletedCount} assessments for user ${email} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user assessments.' });
  }
});

module.exports = router;

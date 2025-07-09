const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const http = require('http');
const https = require('https');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const app = express();

// --- DIRECTORY SETUP ---
const baseUploadsDir = path.join(__dirname, 'public/uploads');
const baseAssessmentFilesDir = path.join(baseUploadsDir, 'assessment_files');
const tempUploadDir = path.join(baseUploadsDir, 'temp'); // Temporary directory for initial uploads

// Ensure all necessary directories exist
[baseUploadsDir, baseAssessmentFilesDir, tempUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const port = process.env.SERVER_PORT || 3001;

// --- DATABASE & MIDDLEWARE ---
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("CRITICAL: MONGODB_URI environment variable not set.");
} else {
  mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key_please_change',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// --- STATIC FILE SERVING ---
// Serve files from the session-specific directories
app.use('/uploads/assessment_files', express.static(baseAssessmentFilesDir));


// --- API CLIENTS ---
const claudeApiKey = process.env.CLAUDE_API_KEY;
let anthropic;
if (claudeApiKey) {
  anthropic = new Anthropic({ apiKey: claudeApiKey });
} else {
  console.error("CRITICAL: CLAUDE_API_KEY environment variable not set.");
}

// --- MONGOOSE SCHEMAS & MODELS ---
const addressSchema = new mongoose.Schema({
  addressLine1: String,
  addressLine2: String,
  suburb: String,
  state: String,
  postcode: String,
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  consent: Boolean,
  diagnoses: {
    herniatedDisc: Boolean,
    spinalStenosis: Boolean,
    spondylolisthesis: Boolean,
    scoliosis: Boolean,
    spinalFracture: Boolean,
    degenerativeDiscDisease: Boolean,
    otherConditionSelected: Boolean,
    other: String,
    mainSymptoms: String,
    symptomDuration: String,
    symptomProgression: String,
  },
  treatments: {
    overTheCounterMedication: Boolean,
    prescriptionAntiInflammatory: Boolean,
    prescriptionAntiInflammatoryName: String,
    prescriptionPainMedication: Boolean,
    prescriptionPainMedicationName: String,
    spinalInjections: Boolean,
    spinalInjectionsDetails: String,
    physiotherapy: Boolean,
    chiropracticTreatment: Boolean,
    osteopathyMyotherapy: Boolean,
  },
  hadSurgery: Boolean,
  surgeries: [{ date: String, procedure: String, surgeon: String, hospital: String }],
  imaging: [{
    type: { type: String },
    hadStudy: Boolean,
    clinic: String,
    date: String,
    documentName: String,
  }],
  imagingRecordsPermission: Boolean,
  painAreas: [{ id: String, region: String, intensity: Number, notes: String, coordinates: { x: Number, y: Number } }],
  redFlags: {
    muscleWeakness: { present: Boolean, areas: mongoose.Schema.Types.Mixed },
    numbnessOrTingling: { present: Boolean, areas: mongoose.Schema.Types.Mixed },
    unexplainedWeightLoss: { present: Boolean, period: String, amountKg: Number },
    bladderOrBowelIncontinence: { present: Boolean, severity: Number, details: String },
    saddleAnaesthesia: { present: Boolean, severity: Number, details: String },
    balanceProblems: { present: { type: Boolean, default: false }, type: { type: String, default: '' } },
    otherRedFlagPresent: Boolean,
    otherRedFlag: String,
  },
  demographics: {
    fullName: String,
    dateOfBirth: String,
    phoneNumber: String,
    email: String,
    residentialAddress: addressSchema,
    isPostalSameAsResidential: Boolean,
    postalAddress: addressSchema,
    funding: {
      source: String,
      healthFundName: String,
      membershipNumber: String,
      claimNumber: String,
      otherSource: String,
    },
    nextOfKin: {
      fullName: String,
      relationship: String,
      phoneNumber: String,
    },
    referringDoctor: {
      hasReferringDoctor: Boolean,
      doctorName: String,
      clinic: String,
      phoneNumber: String,
      email: String,
      fax: String,
    },
    gender: String,
    medicareNumber: String,
    medicareRefNum: String,
    countryOfBirth: String,
  },
  aiSummary: String,
  treatmentGoals: String,
  painMapImageFront: { type: String },
  painMapImageBack: { type: String },
  nextStep: { type: String },
  recommendationText: { type: String },
  systemRecommendation: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
assessmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});
const Assessment = mongoose.model('Assessment', assessmentSchema);

// --- AUTHENTICATION ---
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) return next();
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
};
app.post('/api/doctor/login', (req, res) => {
  if (req.body.password === process.env.DASHBOARD_PASSWORD) {
    req.session.isAuthenticated = true;
    res.status(200).json({ message: 'Login successful.' });
  } else {
    res.status(401).json({ error: 'Invalid password.' });
  }
});
app.get('/api/doctor/check-auth', (req, res) => {
  res.status(200).json({ isAuthenticated: !!(req.session && req.session.isAuthenticated) });
});
app.post('/api/doctor/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ error: 'Could not log out.' });
      res.clearCookie('connect.sid').status(200).json({ message: 'Logout successful.' });
    });
  } else {
    res.status(200).json({ message: 'No active session.' });
  }
});

// --- CORE API ENDPOINTS ---
app.get('/api/doctor/patients', ensureAuthenticated, async (req, res) => {
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
app.get('/api/doctor/patient/:email/assessments', ensureAuthenticated, async (req, res) => {
  try {
    const assessments = await Assessment.find({ 'demographics.email': req.params.email }).sort({ createdAt: -1 });
    res.status(200).json(assessments || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve assessments.' });
  }
});
app.post('/api/assessment', async (req, res) => {
  try {
    const newAssessment = new Assessment(req.body);
    await newAssessment.save();
    res.status(201).json({ message: 'Assessment saved successfully', assessmentId: newAssessment._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save assessment data.' });
  }
});

app.delete('/api/doctor/assessment/:id', ensureAuthenticated, async (req, res) => {
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

app.delete('/api/doctor/user/:email', ensureAuthenticated, async (req, res) => {
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

// --- FILE UPLOAD LOGIC (REVISED) ---
const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir); // Always upload to the temporary directory first
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});
const upload = multer({ storage: tempStorage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/upload/imaging-file', upload.single('imagingFile'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const formSessionId = req.query.formSessionId || 'default_session';
  const sanitizedSessionId = formSessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  
  const finalSessionDir = path.join(baseAssessmentFilesDir, sanitizedSessionId);
  if (!fs.existsSync(finalSessionDir)) {
    fs.mkdirSync(finalSessionDir, { recursive: true });
  }

  const tempPath = req.file.path;
  const finalPath = path.join(finalSessionDir, req.file.filename);
  
  // Move the file from temp to the final session directory
  fs.rename(tempPath, finalPath, (err) => {
    if (err) {
      console.error('Error moving file:', err);
      // Try to clean up the temp file
      try {
        fs.unlinkSync(tempPath);
      } catch (unlinkErr) {
        console.error('Error cleaning up temp file:', unlinkErr);
      }
      return res.status(500).json({ error: 'Failed to process file upload.' });
    }

    // The relative path for the URL should be based on the final location
    let relativeFilePath = path.join(sanitizedSessionId, req.file.filename);
    if (path.sep === '\\') {
      relativeFilePath = relativeFilePath.replace(/\\/g, '/');
    }

    res.status(200).json({
      message: 'File uploaded successfully',
      filePath: relativeFilePath
    });
  });
});

app.post('/api/upload/pain-map', async (req, res) => {
  const { imageData, view, formSessionId } = req.body;

  if (!imageData || !view || !formSessionId) {
    return res.status(400).json({ error: 'Missing required data for pain map upload.' });
  }

  try {
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    const sanitizedSessionId = formSessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    const finalSessionDir = path.join(baseAssessmentFilesDir, sanitizedSessionId);

    if (!fs.existsSync(finalSessionDir)) {
      fs.mkdirSync(finalSessionDir, { recursive: true });
    }

    const filename = `pain-map-${view}-${Date.now()}.png`;
    const finalPath = path.join(finalSessionDir, filename);
    
    fs.writeFileSync(finalPath, base64Data, 'base64');

    let relativeFilePath = path.join(sanitizedSessionId, filename);
    if (path.sep === '\\') {
      relativeFilePath = relativeFilePath.replace(/\\/g, '/');
    }

    res.status(200).json({
      message: 'Pain map uploaded successfully',
      filePath: relativeFilePath
    });
  } catch (error) {
    console.error('Error saving pain map image:', error);
    res.status(500).json({ error: 'Failed to save pain map image.' });
  }
});


// --- AI & EMAIL ENDPOINTS ---
app.post('/api/generate-summary', async (req, res) => {
  if (!anthropic) {
    return res.status(500).json({ error: 'Claude API client not initialized on server. API key may be missing or invalid.' });
  }

  try {
    const formData = req.body;

    if (!formData) {
      return res.status(400).json({ error: 'No form data received.' });
    }

    let patientAge = 'Not provided';
    if (formData.demographics && formData.demographics.dateOfBirth) {
      try {
        const dob = new Date(formData.demographics.dateOfBirth);
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        patientAge = Math.abs(ageDate.getUTCFullYear() - 1970).toString();
      } catch (e) {
        console.error("Error calculating age from DOB:", e);
        patientAge = 'Could not calculate from DOB';
      }
    }

    let comprehensivePrompt = `
Analyze the following patient-provided spine evaluation data and generate a concise clinical summary.
The patient's name is ${formData.demographics?.fullName || 'Not provided'} and their calculated age is ${patientAge} years.
Consider all provided information, including age, symptoms, medical history, red flags, and treatment goals, to tailor the summary and any potential diagnostic considerations or recommendations.
Focus on:
- Key symptoms and their characteristics (location, nature, timing).
- Relevant medical history (diagnoses, surgeries, treatments), including specific details for "other" conditions, main symptoms, symptom duration, and progression.
- Interpretation of pain point data (locations, intensities).
- Patient's stated goals for treatment.
- Specific red flag symptoms reported, including all details like severity, location, type, amount, and period.
Highlight potential red flags or areas needing further investigation based ONLY on the provided data, considering the patient's age and overall clinical picture.
Maintain an objective, structured, and professional tone. Do not provide medical advice or diagnoses not directly derivable from the input.
The summary should be suitable for a medical professional to quickly understand the patient's situation.

Patient Data:
Full Name: ${formData.demographics?.fullName || 'Not provided'}
Date of Birth: ${formData.demographics?.dateOfBirth || 'Not provided'} (Calculated Age: ${patientAge} years)
Medicare Number: ${formData.demographics?.medicareNumber || 'N/A'}
Medicare Ref. No.: ${formData.demographics?.medicareRefNum || 'N/A'}
Treatment Goals: ${formData.treatmentGoals || 'Not provided'}
`;

    if (formData.diagnoses) {
      comprehensivePrompt += "\nMedical History & Symptoms:\n";
      let diagnosedConditions = [];
      if (formData.diagnoses.herniatedDisc) diagnosedConditions.push("Herniated Disc");
      if (formData.diagnoses.spinalStenosis) diagnosedConditions.push("Spinal Stenosis");
      if (formData.diagnoses.spondylolisthesis) diagnosedConditions.push("Spondylolisthesis");
      if (formData.diagnoses.scoliosis) diagnosedConditions.push("Scoliosis");
      if (formData.diagnoses.spinalFracture) diagnosedConditions.push("Spinal Fracture");
      if (formData.diagnoses.degenerativeDiscDisease) diagnosedConditions.push("Degenerative Disc Disease");
      if (formData.diagnoses.otherConditionSelected && formData.diagnoses.other) {
        diagnosedConditions.push(`Other: ${formData.diagnoses.other}`);
      } else if (formData.diagnoses.other && !formData.diagnoses.otherConditionSelected) {
        diagnosedConditions.push(`Other (not explicitly selected as primary): ${formData.diagnoses.other}`);
      }
      
      if (diagnosedConditions.length > 0) {
        comprehensivePrompt += `Diagnosed Conditions: ${diagnosedConditions.join(', ')}\n`;
      }
      if (formData.diagnoses.mainSymptoms) {
        comprehensivePrompt += `Main Symptoms: ${formData.diagnoses.mainSymptoms}\n`;
      }
      if (formData.diagnoses.symptomDuration) {
        comprehensivePrompt += `Symptom Duration: ${formData.diagnoses.symptomDuration}\n`;
      }
      if (formData.diagnoses.symptomProgression) {
        comprehensivePrompt += `Symptom Progression: ${formData.diagnoses.symptomProgression}\n`;
      }
    }

    if (formData.redFlags) {
      comprehensivePrompt += "\nRed Flag Symptoms Reported:\n";
      const { 
        muscleWeakness, numbnessOrTingling, unexplainedWeightLoss, 
        bladderOrBowelIncontinence, saddleAnaesthesia, balanceProblems,
        otherRedFlagPresent, otherRedFlag 
      } = formData.redFlags;

      if (muscleWeakness?.present && muscleWeakness.areas) {
        const areaDetails = Object.entries(muscleWeakness.areas)
          .filter(([, val]) => val.selected)
          .map(([areaName, val]) => `${areaName} (Severity: ${val.severity || 0})`).join(', ');
        if (areaDetails) comprehensivePrompt += `- Muscle Weakness: Present, Areas: ${areaDetails}\n`;
        else comprehensivePrompt += `- Muscle Weakness: Present (no specific areas detailed with severity)\n`;
      }
      if (numbnessOrTingling?.present && numbnessOrTingling.areas) {
        const areaDetails = Object.entries(numbnessOrTingling.areas)
          .filter(([, val]) => val.selected)
          .map(([areaName, val]) => `${areaName} (Severity: ${val.severity || 0})`).join(', ');
        if (areaDetails) comprehensivePrompt += `- Numbness Or Tingling: Present, Areas: ${areaDetails}\n`;
        else comprehensivePrompt += `- Numbness Or Tingling: Present (no specific areas detailed with severity)\n`;
      }
      if (unexplainedWeightLoss?.present) {
        comprehensivePrompt += `- Unexplained Weight Loss: Present`;
        if (unexplainedWeightLoss.amountKg !== undefined) comprehensivePrompt += `, Amount: ${unexplainedWeightLoss.amountKg}kg`;
        if (unexplainedWeightLoss.period) comprehensivePrompt += `, Period: ${unexplainedWeightLoss.period}`;
        comprehensivePrompt += `\n`;
      }
      if (bladderOrBowelIncontinence?.present) {
        comprehensivePrompt += `- Bladder Or Bowel Incontinence: Present`;
        if (bladderOrBowelIncontinence.details) comprehensivePrompt += `, Type: ${bladderOrBowelIncontinence.details}`;
        if (bladderOrBowelIncontinence.severity !== undefined) comprehensivePrompt += `, Severity: ${bladderOrBowelIncontinence.severity}/10`;
        comprehensivePrompt += `\n`;
      }
      if (saddleAnaesthesia?.present) {
        comprehensivePrompt += `- Saddle Anaesthesia: Present`;
        if (saddleAnaesthesia.details) comprehensivePrompt += `, Area: ${saddleAnaesthesia.details}`;
        if (saddleAnaesthesia.severity !== undefined) comprehensivePrompt += `, Severity: ${saddleAnaesthesia.severity}/10`;
        comprehensivePrompt += `\n`;
      }
      if (balanceProblems?.present && balanceProblems.type) {
        comprehensivePrompt += `- Balance Problems: Present, Type: ${balanceProblems.type}\n`;
      }
      if (otherRedFlagPresent && otherRedFlag) {
        comprehensivePrompt += `- Other Red Flags: ${otherRedFlag}\n`;
      }
    } else {
      comprehensivePrompt += "\nRed Flag Symptoms: Not provided or none reported.\n";
    }
    
    if (formData.imagingRecordsPermission) {
      comprehensivePrompt += "\nImaging Records Permission: Granted\n";
    } else {
      comprehensivePrompt += "\nImaging Records Permission: Not Granted\n";
    }

    if (formData.painAreas && formData.painAreas.length > 0) {
      comprehensivePrompt += "\nPain Areas Reported:\n";
      formData.painAreas.forEach(area => {
        comprehensivePrompt += `- Region: ${area.region}, Intensity: ${area.intensity}/10, Notes: ${area.notes || 'N/A'}\n`;
      });
    }
    
    if (formData.treatments) {
        comprehensivePrompt += "\nTreatments Received:\n";
        Object.entries(formData.treatments).forEach(([treatmentKey, treatmentValue]) => {
            if (treatmentValue === true && !treatmentKey.includes('Name') && !treatmentKey.includes('Details')) {
                let treatmentName = treatmentKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                let details = '';
                if (treatmentKey === 'prescriptionAntiInflammatory' && formData.treatments.prescriptionAntiInflammatoryName) {
                    details = `: ${formData.treatments.prescriptionAntiInflammatoryName}`;
                } else if (treatmentKey === 'prescriptionPainMedication' && formData.treatments.prescriptionPainMedicationName) {
                    details = `: ${formData.treatments.prescriptionPainMedicationName}`;
                } else if (treatmentKey === 'spinalInjections' && formData.treatments.spinalInjectionsDetails) {
                    details = `: ${formData.treatments.spinalInjectionsDetails}`;
                }
                comprehensivePrompt += `- ${treatmentName}${details}\n`;
            }
        });
    }

    if (formData.surgeries && formData.surgeries.length > 0 && formData.hadSurgery) {
      comprehensivePrompt += "\nSurgical History:\n";
      formData.surgeries.forEach(surgery => {
        comprehensivePrompt += `- Procedure: ${surgery.procedure || 'N/A'}, Date: ${surgery.date || 'N/A'}, Surgeon: ${surgery.surgeon || 'N/A'}, Hospital: ${surgery.hospital || 'N/A'}\n`;
      });
    } else if (formData.hadSurgery === false) {
      comprehensivePrompt += "\nSurgical History: No surgical history reported.\n";
    }

    if (formData.imaging && formData.imaging.some(img => img.hadStudy)) {
      comprehensivePrompt += "\nImaging History:\n";
      formData.imaging.filter(img => img.hadStudy).forEach(img => {
        comprehensivePrompt += `- Type: ${img.type || 'N/A'}, Date: ${img.date || 'N/A'}, Clinic: ${img.clinic || 'N/A'}${img.documentName ? ', Document: Available' : ''}\n`;
      });
    }

    console.log("Sending prompt to Claude API...");

    const claudeResponse = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      messages: [{ role: "user", content: comprehensivePrompt }],
    });
    
    let summary = "No summary content found from AI.";
    if (claudeResponse.content && claudeResponse.content.length > 0 && claudeResponse.content[0].type === 'text') {
        summary = claudeResponse.content[0].text;
    } else {
        console.warn("Unexpected Claude API response structure:", claudeResponse);
    }
    
    console.log("Received summary from Claude API.");
    res.status(200).json({ summary: summary });

  } catch (error) {
    console.error('Error in /api/generate-summary endpoint:', error);
    let errorMessage = 'Failed to generate AI summary via backend.';
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
        errorMessage = error.response.data.error.message;
    } else if (error.message) {
        errorMessage = error.message;
    }
    res.status(500).json({ error: errorMessage });
  }
});
app.post('/api/email/send-assessment', async (req, res) => {
  if (!transporter) {
    return res.status(503).json({ error: 'Email service is not configured or unavailable.' });
  }

  try {
    const { formData, aiSummary, recommendationText, nextStep, systemRecommendation, clientOrigin } = req.body;

    if (!formData || !aiSummary) {
      return res.status(400).json({ error: 'Missing required data for email (formData or aiSummary).' });
    }
    
    const serverBaseUrl = process.env.SERVER_BASE_URL;
    const primaryRecipient = process.env.EMAIL_RECIPIENT_ADDRESS;
    if (!primaryRecipient) {
        console.error('CRITICAL: EMAIL_RECIPIENT_ADDRESS is not set in .env for the primary recipient.');
        return res.status(500).json({ error: 'Primary email recipient not configured on server.' });
    }

    const adminRecipients = new Set();
    adminRecipients.add(primaryRecipient);
    if (process.env.BCC_EMAIL_RECIPIENT_ADDRESS) {
        process.env.BCC_EMAIL_RECIPIENT_ADDRESS.split(',').forEach(bcc => adminRecipients.add(bcc.trim()));
    }

    const patientEmail = formData.demographics?.email;
    const subjectDate = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Send email to admin/BCC
    const attachments = [];
    if (formData.painMapImageFront) {
      const frontImagePath = path.join(baseAssessmentFilesDir, formData.painMapImageFront);
      if (fs.existsSync(frontImagePath)) {
        attachments.push({
          filename: 'painMapFront.png',
          path: frontImagePath,
          cid: 'painMapFront'
        });
      }
    }
    if (formData.painMapImageBack) {
      const backImagePath = path.join(baseAssessmentFilesDir, formData.painMapImageBack);
      if (fs.existsSync(backImagePath)) {
        attachments.push({
          filename: 'painMapBack.png',
          path: backImagePath,
          cid: 'painMapBack'
        });
      }
    }

    // Send email to admin/BCC
    const adminHtmlContent = generateAssessmentEmailHTML({ formData, aiSummary, recommendationText: systemRecommendation, nextStep: formData.nextStep }, serverBaseUrl, 'admin');
    const adminMailOptions = {
      from: `"Spine IQ Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
      to: Array.from(adminRecipients).join(', '),
      subject: `Spine Assessment Summary - ${formData.demographics?.fullName || 'N/A'} - ${subjectDate}`,
      html: adminHtmlContent,
      attachments: attachments
    };
    await transporter.sendMail(adminMailOptions);

    // Send email to patient
    if (patientEmail && typeof patientEmail === 'string' && patientEmail.trim() !== '' && !adminRecipients.has(patientEmail)) {
      const patientHtmlContent = generateAssessmentEmailHTML({ formData, aiSummary, recommendationText: systemRecommendation, nextStep: formData.nextStep }, serverBaseUrl, 'patient');
      const patientMailOptions = {
        from: `"Spine IQ Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: patientEmail,
        subject: `Your Spine Assessment Summary - ${subjectDate}`,
        html: patientHtmlContent,
        // No attachments for the patient email
      };
      await transporter.sendMail(patientMailOptions);
    }

    res.status(200).json({ message: 'Assessment email(s) sent successfully.' });

  } catch (error) {
    console.error('Error sending assessment email:', error);
    res.status(500).json({ error: 'Failed to send assessment email.' });
  }
});

// --- NODEMAILER & SERVER START ---
let transporter;
if (process.env.MAILGUN_SMTP_LOGIN && process.env.MAILGUN_SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.MAILGUN_SMTP_SERVER,
    port: parseInt(process.env.MAILGUN_SMTP_PORT || "587", 10),
    secure: parseInt(process.env.MAILGUN_SMTP_PORT || "587", 10) === 465,
    auth: {
      user: process.env.MAILGUN_SMTP_LOGIN,
      pass: process.env.MAILGUN_SMTP_PASSWORD,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('Nodemailer transporter verification error:', error);
    } else {
      console.log('Nodemailer transporter is ready to send emails.');
    }
  });
} else {
  console.warn('Mailgun SMTP credentials not fully set in .env. Email sending will be disabled.');
}

// --- SERVER START ---
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

function generateAssessmentEmailHTML(data, serverBaseUrl, recipientType) {
  const { formData, aiSummary, recommendationText, nextStep } = data;

  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h1 { color: #2c3e50; }
          h2 { color: #34495e; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }
          .section-title { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
          .field-label { font-weight: bold; color: #555; }
          .field-value { margin-left: 10px; }
          ul { padding-left: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px;}
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left;}
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <h1>Spine Assessment Report</h1>
  `;

  if (recipientType === 'patient') {
    if (aiSummary) {
      html += `
        <div class="section">
          <div class="section-title">Spinal AI Matrix Analysis</div>
          <p>${aiSummary.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }
  }

  if (formData.demographics) {
    html += `
      <div class="section">
        <div class="section-title">Personal Information</div>
        <p><span class="field-label">Full Name:</span> <span class="field-value">${formData.demographics.fullName || 'N/A'}</span></p>
        <p><span class="field-label">Date of Birth:</span> <span class="field-value">${formData.demographics.dateOfBirth || 'N/A'}</span></p>
        <p><span class="field-label">Phone:</span> <span class="field-value">${formData.demographics.phoneNumber || 'N/A'}</span></p>
        <p><span class="field-label">Email:</span> <span class="field-value">${formData.demographics.email || 'N/A'}</span></p>
        <p><span class="field-label">Residential Address:</span> <span class="field-value">${formData.demographics.residentialAddress.addressLine1 || ''}, ${formData.demographics.residentialAddress.addressLine2 ? formData.demographics.residentialAddress.addressLine2 + ', ' : ''}${formData.demographics.residentialAddress.suburb || ''}, ${formData.demographics.residentialAddress.state || ''}, ${formData.demographics.residentialAddress.postcode || ''}</span></p>
        ${!formData.demographics.isPostalSameAsResidential && formData.demographics.postalAddress ? `<p><span class="field-label">Postal Address:</span> <span class="field-value">${formData.demographics.postalAddress.addressLine1 || ''}, ${formData.demographics.postalAddress.addressLine2 ? formData.demographics.postalAddress.addressLine2 + ', ' : ''}${formData.demographics.postalAddress.suburb || ''}, ${formData.demographics.postalAddress.state || ''}, ${formData.demographics.postalAddress.postcode || ''}</span></p>` : ''}
        ${formData.demographics.funding && formData.demographics.funding.source ? `
          <div class="section">
            <div class="section-title">Funding Information</div>
            <p><span class="field-label">Source:</span> <span class="field-value">${formData.demographics.funding.source}</span></p>
            ${formData.demographics.funding.source === 'Private Health Insurance' ? `
              <p><span class="field-label">Health Fund:</span> <span class="field-value">${formData.demographics.funding.healthFundName || 'N/A'}</span></p>
              <p><span class="field-label">Membership No.:</span> <span class="field-value">${formData.demographics.funding.membershipNumber || 'N/A'}</span></p>
            ` : ''}
            ${['Workers Compensation', 'DVA', 'TAC'].includes(formData.demographics.funding.source) && formData.demographics.funding.claimNumber ? `
              <p><span class="field-label">Claim/Reference No.:</span> <span class="field-value">${formData.demographics.funding.claimNumber}</span></p>
            ` : ''}
            ${formData.demographics.funding.source === 'Other' && formData.demographics.funding.otherSource ? `
              <p><span class="field-label">Other Source:</span> <span class="field-value">${formData.demographics.funding.otherSource}</span></p>
            ` : ''}
          </div>
        ` : ''}
        ${formData.demographics.nextOfKin ? `
          <div class="section">
            <div class="section-title">Emergency Contact</div>
            <p><span class="field-label">Name:</span> <span class="field-value">${formData.demographics.nextOfKin.fullName || 'N/A'}</span></p>
            <p><span class="field-label">Relationship:</span> <span class="field-value">${formData.demographics.nextOfKin.relationship || 'N/A'}</span></p>
            <p><span class="field-label">Phone:</span> <span class="field-value">${formData.demographics.nextOfKin.phoneNumber || 'N/A'}</span></p>
          </div>
        ` : ''}
        ${formData.demographics.referringDoctor ? `
          <div class="section">
            <div class="section-title">Referring Doctor</div>
            ${formData.demographics.referringDoctor.hasReferringDoctor ? `
              <p><span class="field-label">Name:</span> <span class="field-value">${formData.demographics.referringDoctor.doctorName || 'N/A'}</span></p>
              <p><span class="field-label">Clinic:</span> <span class="field-value">${formData.demographics.referringDoctor.clinic || 'N/A'}</span></p>
              <p><span class="field-label">Phone:</span> <span class="field-value">${formData.demographics.referringDoctor.phoneNumber || 'N/A'}</span></p>
              <p><span class="field-label">Email:</span> <span class="field-value">${formData.demographics.referringDoctor.email || 'N/A'}</span></p>
              <p><span class="field-label">Fax:</span> <span class="field-value">${formData.demographics.referringDoctor.fax || 'N/A'}</span></p>
            ` : '<p>No referring doctor.</p>'}
          </div>
        ` : ''}
        ${formData.demographics.gender ? `<p><span class="field-label">Gender:</span> <span class="field-value">${formData.demographics.gender}</span></p>` : ''}
        ${formData.demographics.medicareNumber ? `<p><span class="field-label">Medicare Number:</span> <span class="field-value">${formData.demographics.medicareNumber}</span></p>` : ''}
        ${formData.demographics.medicareRefNum ? `<p><span class="field-label">Medicare Ref. No.:</span> <span class="field-value">${formData.demographics.medicareRefNum}</span></p>` : ''}
        ${formData.demographics.countryOfBirth ? `<p><span class="field-label">Country of Birth:</span> <span class="field-value">${formData.demographics.countryOfBirth}</span></p>` : ''}
      </div>
    `;
  }
  
  if (formData.diagnoses) {
    html += '<div class="section"><div class="section-title">Medical Conditions & Symptoms</div><ul>';
    const diagnosesOrder = [
      'herniatedDisc', 'spinalStenosis', 'spondylolisthesis', 
      'scoliosis', 'spinalFracture', 'degenerativeDiscDisease',
      'otherConditionSelected'
    ];
    diagnosesOrder.forEach(key => {
      if (formData.diagnoses[key] === true) {
        if (key === 'otherConditionSelected' && formData.diagnoses.other) {
          html += `<li>Other: ${formData.diagnoses.other}</li>`;
        } else if (key !== 'otherConditionSelected') {
          const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          html += `<li>${readableKey}</li>`;
        }
      }
    });
    if (formData.diagnoses.other && !formData.diagnoses.otherConditionSelected) {
        html += `<li>Other (not selected as primary): ${formData.diagnoses.other}</li>`;
    }
    if (formData.diagnoses.mainSymptoms) {
      html += `<li>Main Symptoms: ${formData.diagnoses.mainSymptoms.replace(/\n/g, '<br>')}</li>`;
    }
    if (formData.diagnoses.symptomDuration) {
      html += `<li>Symptom Duration: ${formData.diagnoses.symptomDuration}</li>`;
    }
    if (formData.diagnoses.symptomProgression) {
      html += `<li>Symptom Progression: ${formData.diagnoses.symptomProgression}</li>`;
    }
    html += '</ul></div>';
  }

    if (formData.redFlags) {
      let redFlagsHtml = '';
      const { 
        muscleWeakness, numbnessOrTingling, unexplainedWeightLoss, 
        bladderOrBowelIncontinence, saddleAnaesthesia, balanceProblems,
        otherRedFlagPresent, otherRedFlag 
      } = formData.redFlags;

      if (muscleWeakness?.present) {
        let areaDetails = "Present";
        if (muscleWeakness.areas) {
          const selectedAreas = Object.entries(muscleWeakness.areas)
            .filter(([, val]) => val.selected)
            .map(([areaName, val]) => `${areaName} (Severity: ${val.severity || 0})`).join(', ');
          if (selectedAreas) areaDetails += `, Areas: ${selectedAreas}`;
          else areaDetails += ` (no specific areas detailed with severity)`;
        }
        redFlagsHtml += `<li>Muscle Weakness: ${areaDetails}</li>`;
      }
      if (numbnessOrTingling?.present) {
        let areaDetails = "Present";
        if (numbnessOrTingling.areas) {
          const selectedAreas = Object.entries(numbnessOrTingling.areas)
            .filter(([, val]) => val.selected)
            .map(([areaName, val]) => `${areaName} (Severity: ${val.severity || 0})`).join(', ');
          if (selectedAreas) areaDetails += `, Areas: ${selectedAreas}`;
          else areaDetails += ` (no specific areas detailed with severity)`;
        }
        redFlagsHtml += `<li>Numbness Or Tingling: ${areaDetails}</li>`;
      }
      if (unexplainedWeightLoss?.present) {
        redFlagsHtml += `<li>Unexplained Weight Loss: Present`;
        if (unexplainedWeightLoss.amountKg !== undefined) redFlagsHtml += `, Amount: ${unexplainedWeightLoss.amountKg}kg`;
        if (unexplainedWeightLoss.period) redFlagsHtml += `, Period: ${unexplainedWeightLoss.period}`;
        redFlagsHtml += `</li>`;
      }
      if (bladderOrBowelIncontinence?.present) {
        redFlagsHtml += `<li>Bladder Or Bowel Incontinence: Present`;
        if (bladderOrBowelIncontinence.details) redFlagsHtml += `, Type: ${bladderOrBowelIncontinence.details}`;
        if (bladderOrBowelIncontinence.severity !== undefined) redFlagsHtml += `, Severity: ${bladderOrBowelIncontinence.severity}/10`;
        redFlagsHtml += `</li>`;
      }
      if (saddleAnaesthesia?.present) {
        redFlagsHtml += `<li>Saddle Anaesthesia: Present`;
        if (saddleAnaesthesia.details) redFlagsHtml += `, Area: ${saddleAnaesthesia.details}`;
        if (saddleAnaesthesia.severity !== undefined) redFlagsHtml += `, Severity: ${saddleAnaesthesia.severity}/10`;
        redFlagsHtml += `</li>`;
      }
      if (balanceProblems?.present && balanceProblems.type) {
        redFlagsHtml += `<li>Balance Problems: Present, Type: ${balanceProblems.type}</li>`;
      }
      if (otherRedFlagPresent && otherRedFlag) {
        redFlagsHtml += `<li>Other Red Flags: ${otherRedFlag}</li>`;
      }

      if (redFlagsHtml) {
        html += `
          <div class="section">
            <div class="section-title">Red Flag Symptoms</div>
            <ul>${redFlagsHtml}</ul>
          </div>
        `;
      }
    }
    
    if (formData.imagingRecordsPermission !== undefined) {
         html += `
            <div class="section">
                <div class="section-title">Imaging Records Permission</div>
                <p>${formData.imagingRecordsPermission ? 'Permission Granted' : 'Permission Not Granted'}</p>
            </div>
        `;
    }
  
    if (formData.treatmentGoals) {
    html += `
      <div class="section">
        <div class="section-title">Treatment Goals</div>
        <p>${formData.treatmentGoals.replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }


  if (formData.painAreas && formData.painAreas.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Pain Assessment</div>
        <table>
          <thead><tr><th>Region</th><th>Intensity (0-10)</th><th>Notes</th></tr></thead>
          <tbody>
            ${formData.painAreas.map(area => `
              <tr>
                <td>${area.region || 'N/A'}</td>
                <td>${area.intensity || 'N/A'}</td>
                <td>${area.notes || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  if (formData.treatments) {
    html += '<div class="section"><div class="section-title">Non-Surgical Treatments</div><ul>';
    for (const [key, value] of Object.entries(formData.treatments)) {
      if (value === true && !key.includes('Name') && !key.includes('Details')) {
         const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
         let details = '';
         if (key === 'prescriptionAntiInflammatory' && formData.treatments.prescriptionAntiInflammatoryName) details = `: ${formData.treatments.prescriptionAntiInflammatoryName}`;
         else if (key === 'prescriptionPainMedication' && formData.treatments.prescriptionPainMedicationName) details = `: ${formData.treatments.prescriptionPainMedicationName}`;
         else if (key === 'spinalInjections' && formData.treatments.spinalInjectionsDetails) details = `: ${formData.treatments.spinalInjectionsDetails}`;
         html += `<li>${readableKey}${details}</li>`;
      }
    }
    html += '</ul></div>';
  }

  if (formData.surgeries && formData.surgeries.length > 0 && formData.hadSurgery) {
    html += `
      <div class="section">
        <div class="section-title">Surgical History</div>
        <table>
          <thead><tr><th>Date</th><th>Procedure</th><th>Surgeon</th><th>Hospital</th></tr></thead>
          <tbody>
            ${formData.surgeries.map(surgery => `
              <tr>
                <td>${surgery.date || 'N/A'}</td>
                <td>${surgery.procedure || 'N/A'}</td>
                <td>${surgery.surgeon || 'N/A'}</td>
                <td>${surgery.hospital || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (formData.hadSurgery === false) {
     html += '<div class="section"><div class="section-title">Surgical History</div><p>No surgical history reported.</p></div>';
  }
  
  if (formData.imaging && formData.imaging.some(img => img.hadStudy)) {
    html += `
      <div class="section">
        <div class="section-title">Imaging History</div>
        <table>
          <thead><tr><th>Type</th><th>Date</th><th>Clinic</th><th>Document</th></tr></thead>
          <tbody>
            ${formData.imaging.filter(img => img.hadStudy).map(img => {
              let docLink = 'N/A';
              if (img.documentName && serverBaseUrl) {
                docLink = `<a href="${serverBaseUrl}/uploads/assessment_files/${img.documentName}" target="_blank">View Document</a>`;
              } else if (img.documentName) {
                docLink = `Document: ${img.documentName} (Link unavailable)`;
              }
              return `
                <tr>
                  <td>${img.type || 'N/A'}</td>
                  <td>${img.date || 'N/A'}</td>
                  <td>${img.clinic || 'N/A'}</td>
                  <td>${docLink}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    html += '<div class="section"><div class="section-title">Imaging History</div><p>No imaging studies reported.</p></div>';
  }

  if (recipientType === 'admin' && (formData.painMapImageFront || formData.painMapImageBack)) {
    html += `
      <div class="section">
        <div class="section-title">Pain Map Images</div>
    `;
    if (formData.painMapImageFront) {
      html += `
        <h3>Front View</h3>
        <img src="cid:painMapFront" alt="Pain Map Front View" style="max-width: 100%; height: auto;" />
      `;
    }
    if (formData.painMapImageBack) {
      html += `
        <h3>Back View</h3>
        <img src="cid:painMapBack" alt="Pain Map Back View" style="max-width: 100%; height: auto;" />
      `;
    }
    html += `</div>`;
  }

  if (recipientType === 'admin') {
    if (aiSummary) {
      html += `
        <div class="section">
          <div class="section-title">Spinal AI Matrix Analysis</div>
          <p>${aiSummary.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }
    if (nextStep) {
        html += `
        <div class="section">
          <div class="section-title">Next Step Chosen by User</div>
          <p>${nextStep}</p>
        </div>
      `;
    }
    if (recommendationText) {
      html += `
        <div class="section">
          <div class="section-title">Adaptive Next-Step Evaluation</div>
          <p>${recommendationText}</p>
        </div>
      `;
    }
  }

  html += `
      </body>
    </html>
  `;
  return html;
}

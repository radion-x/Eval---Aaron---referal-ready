const express = require('express');
const router = express.Router();
const { Anthropic } = require('@anthropic-ai/sdk');
const Assessment = require('../models/Assessment');
const transporter = require('../config/nodemailer');
const { generateComprehensivePrompt } = require('../prompt-builder.js');
const path = require('path');
const fs = require('fs');

const claudeApiKey = process.env.CLAUDE_API_KEY;
let anthropic;
if (claudeApiKey) anthropic = new Anthropic({ apiKey: claudeApiKey });

const baseAssessmentFilesDir = path.join(__dirname, '../public/uploads/assessment_files');

router.post('/generate-summary', async (req, res) => {
  if (!anthropic) {
    return res.status(500).json({ error: 'Claude API client not initialized on server. API key may be missing or invalid.' });
  }

  try {
    const formData = req.body;
    if (!formData) {
      return res.status(400).json({ error: 'No form data received.' });
    }

    const comprehensivePrompt = generateComprehensivePrompt(formData);
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

router.post('/assessment', async (req, res) => {
  try {
    const newAssessment = new Assessment(req.body);
    await newAssessment.save();
    res.status(201).json({ message: 'Assessment saved successfully', assessmentId: newAssessment._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save assessment data.' });
  }
});

router.post('/email/send-assessment', async (req, res) => {
  if (!transporter) {
    return res.status(503).json({ error: 'Email service is not configured or unavailable.' });
  }

  try {
    const { formData, aiSummary } = req.body;
    if (!formData || !aiSummary) {
      return res.status(400).json({ error: 'Missing required data for email (formData or aiSummary).' });
    }
    
    const serverBaseUrl = process.env.SERVER_BASE_URL;
    const primaryRecipient = process.env.EMAIL_RECIPIENT_ADDRESS;
    if (!primaryRecipient) {
        console.error('CRITICAL: EMAIL_RECIPIENT_ADDRESS is not set in .env for the primary recipient.');
        return res.status(500).json({ error: 'Primary email recipient not configured on server.' });
    }

    const adminRecipients = new Set([primaryRecipient]);
    if (process.env.BCC_EMAIL_RECIPIENT_ADDRESS) {
        process.env.BCC_EMAIL_RECIPIENT_ADDRESS.split(',').forEach(bcc => adminRecipients.add(bcc.trim()));
    }

    const patientEmail = formData.demographics?.email;
    const subjectDate = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

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

    const adminHtmlContent = generateAssessmentEmailHTML({ ...req.body }, serverBaseUrl, 'admin');
    const adminMailOptions = {
      from: `"Spine IQ Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
      to: primaryRecipient,
      bcc: process.env.BCC_EMAIL_RECIPIENT_ADDRESS,
      subject: `Spine Assessment Summary - ${formData.demographics?.fullName || 'N/A'} - ${subjectDate}`,
      html: adminHtmlContent,
      attachments: attachments
    };
    await transporter.sendMail(adminMailOptions);

    if (patientEmail && typeof patientEmail === 'string' && patientEmail.trim() !== '' && !adminRecipients.has(patientEmail)) {
      const patientHtmlContent = generateAssessmentEmailHTML({ ...req.body }, serverBaseUrl, 'patient');
      const patientMailOptions = {
        from: `"Spine IQ Assessment" <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: patientEmail,
        subject: `Your Spine Assessment Summary - ${subjectDate}`,
        html: patientHtmlContent,
      };
      await transporter.sendMail(patientMailOptions);
    }

    res.status(200).json({ message: 'Assessment email(s) sent successfully.' });
  } catch (error) {
    console.error('Error sending assessment email:', error);
    res.status(500).json({ error: 'Failed to send assessment email.' });
  }
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
          <div class="section-title">Initial Triage: Report and Summary</div>
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
        if (unexplainedWeightLoss.amountKg !== undefined) comprehensivePrompt += `, Amount: ${unexplainedWeightLoss.amountKg}kg`;
        if (unexplainedWeightLoss.period) comprehensivePrompt += `, Period: ${unexplainedWeightLoss.period}`;
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
          <thead><tr><th>Type</th><th>Date</th><th>Clinic</th><th>Spinal Region</th><th>Document</th></tr></thead>
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
                  <td>${(img.spinalRegions && img.spinalRegions.length) ? img.spinalRegions.join(', ') : 'N/A'}</td>
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
          <div class="section-title">Initial Triage: Report and Summary</div>
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

module.exports = router;

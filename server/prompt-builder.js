function generateComprehensivePrompt(formData) {
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
Maintain an objective, structured, and professional tone. Do not provide medical advice or diagnoses not directly derivable from the input. It is imperative that the word "recommendation" or its variations are not used in the summary.
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

    return comprehensivePrompt;
}

module.exports = { generateComprehensivePrompt };

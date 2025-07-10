import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFormContext } from '../../context/FormContext';
import { useTheme } from '../../context/ThemeContext';
// import { RedFlagsData } from '../../data/formData'; // RedFlagsData type is implicitly handled via formData

const SummaryStep: React.FC = () => {
  const {
    formData,
    updateFormData,
    // setSubmitAction,  // Changed to registerSubmitAction
    registerSubmitAction,
    setIsReadyForFinalSubmit,
    summaryProcessCompletedForSession,
    setSummaryProcessCompletedForSession,
    aiSummary: contextAiSummary,
    setAiSummary: setContextAiSummary,
    isInitialProcessingCompleteForSubmit,
    setIsInitialProcessingCompleteForSubmit,
    setIsSubmissionSuccessful // Added
  } = useFormContext();
  const { theme } = useTheme();

  const formDataRef = useRef(formData);

  const getNextStepSuggestion = useCallback(() => {
    const { imaging, painAreas, hadSurgery } = formDataRef.current;
    const hasImaging = imaging.some(img => img.hadStudy);
    const hasHighPain = painAreas.some(area => area.intensity >= 5);
    const hasPersistentSymptoms = painAreas.length > 0;

    if (!hasImaging && hasHighPain) return "Referral for imaging";
    if (hadSurgery && hasPersistentSymptoms) return "Book a Specialist Appointment";
    if (!hadSurgery && hasPersistentSymptoms) return "Referral to Allied Health";
    return "No Immediate Action Needed";
  }, []);

  useEffect(() => {
    const suggestion = getNextStepSuggestion();
    if (formData.systemRecommendation !== suggestion) {
      updateFormData({ systemRecommendation: suggestion });
    }
  }, [formData.systemRecommendation, getNextStepSuggestion, updateFormData]);

  const [isLoadingAiSummary, setIsLoadingAiSummary] = useState<boolean>(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [isSavingAssessment, setIsSavingAssessment] = useState<boolean>(false);
  const [saveAssessmentError, setSaveAssessmentError] = useState<string | null>(null);
  const [saveAssessmentSuccess, setSaveAssessmentSuccess] = useState<string | null>(null);
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);
  const [sendEmailSuccess, setSendEmailSuccess] = useState<string | null>(null);
  const [overallStatusMessage, setOverallStatusMessage] = useState<string | null>(null);

  type EmailStatus = 'idle' | 'sending' | 'sent' | 'error';
  const emailStateRef = useRef<EmailStatus>('idle');

  const contextAiSummaryRef = useRef(contextAiSummary);
  const emailSendAttemptedRef = useRef(false);

  const isInitialProcessingCompleteRef = useRef(isInitialProcessingCompleteForSubmit);
  const saveAssessmentErrorRef = useRef(saveAssessmentError);
  const aiSummaryErrorRef = useRef(aiSummaryError);
  const isLoadingAiSummaryRef = useRef(isLoadingAiSummary);

  useEffect(() => { isInitialProcessingCompleteRef.current = isInitialProcessingCompleteForSubmit; }, [isInitialProcessingCompleteForSubmit]);
  useEffect(() => { saveAssessmentErrorRef.current = saveAssessmentError; }, [saveAssessmentError]);
  useEffect(() => { aiSummaryErrorRef.current = aiSummaryError; }, [aiSummaryError]);
  useEffect(() => { isLoadingAiSummaryRef.current = isLoadingAiSummary; }, [isLoadingAiSummary]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const highestPainIntensity = formData.painAreas.length > 0
    ? Math.max(...formData.painAreas.map(area => area.intensity))
    : 0;

  useEffect(() => {
    formDataRef.current = formData;
    contextAiSummaryRef.current = contextAiSummary;
  }, [formData, contextAiSummary, theme]);

  const handleFinalSubmit = useCallback(async (isUserInitiated = false) => {
    if (isUserInitiated) {
      emailSendAttemptedRef.current = true;
    }
  
    if (emailStateRef.current === 'sending' || isSavingAssessment) {
      setTimeout(() => setOverallStatusMessage("Submission is already in progress."), 0);
      return;
    }
    if (emailStateRef.current === 'sent') {
      setTimeout(() => setOverallStatusMessage("Evaluation has already been submitted successfully."), 0);
      return;
    }
  
    // Pre-submission checks
    if (!isInitialProcessingCompleteRef.current || !contextAiSummaryRef.current || aiSummaryErrorRef.current) {
      let message = "Cannot submit: ";
      if (!isInitialProcessingCompleteRef.current) message += "Initial processing not complete. ";
      if (!contextAiSummaryRef.current && !aiSummaryErrorRef.current && !isLoadingAiSummaryRef.current) message += "AI Summary not available. ";
      else if (aiSummaryErrorRef.current) message += `AI Summary error: ${aiSummaryErrorRef.current}. `;
      
      setTimeout(() => setOverallStatusMessage(message.trim()), 0);
      emailStateRef.current = 'error'; // Use emailStateRef to track submission state
      return;
    }
  
    emailStateRef.current = 'sending'; // Indicates submission process has started
    setSaveAssessmentError(null);
    setSendEmailError(null);
    setSaveAssessmentSuccess(null);
    setSendEmailSuccess(null);
    setOverallStatusMessage("Saving evaluation...");
    setIsSavingAssessment(true);
  
    try {
      // --- 1. Save the complete assessment ---
      const currentFormData = formDataRef.current;
      const currentContextAiSummary = contextAiSummaryRef.current;
      const assessmentToSave = {
        ...currentFormData,
        aiSummary: currentContextAiSummary,
        recommendationText: currentFormData.systemRecommendation,
        nextStep: currentFormData.nextStep,
      };
  
      const saveResponse = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentToSave),
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveData.error || `Saving evaluation failed (Status: ${saveResponse.status})`);
      }
      setSaveAssessmentSuccess(`Evaluation (ID: ${saveData.assessmentId}) saved.`);
      setIsSavingAssessment(false);
  
      // --- 2. Send the email ---
      setOverallStatusMessage("Evaluation saved. Sending email...");
      const emailPayload = {
        formData: assessmentToSave, // Use the saved data
        aiSummary: currentContextAiSummary,
        clientOrigin: window.location.origin,
      };
  
      const emailResponse = await fetch('/api/email/send-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });
      const emailData = await emailResponse.json();
      if (!emailResponse.ok) {
        throw new Error(emailData.error || `Sending email failed (Status: ${emailResponse.status})`);
      }
  
      setSendEmailSuccess(emailData.message || "Email sent successfully!");
      setOverallStatusMessage("Evaluation submitted successfully!");
      emailStateRef.current = 'sent';
      if (setIsSubmissionSuccessful) setIsSubmissionSuccessful(true);
  
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred during submission.";
      setSaveAssessmentError(message); // Use a general error state
      setOverallStatusMessage(`Submission Error: ${message}`);
      emailStateRef.current = 'error';
      setIsSavingAssessment(false);
    }
  }, [
    isSavingAssessment,
    setSaveAssessmentError,
    setSendEmailError,
    setSaveAssessmentSuccess,
    setSendEmailSuccess,
    setOverallStatusMessage,
    setIsSubmissionSuccessful,
  ]);

  const userInitiatedSend = useCallback(() => {
    return handleFinalSubmit(true);
  }, [handleFinalSubmit]);

  const isPerformingWorkRef = useRef(false);

  useEffect(() => {
    const generateAiSummary = async () => {
      if (isPerformingWorkRef.current) return;
      isPerformingWorkRef.current = true;

      setIsLoadingAiSummary(true);
      setContextAiSummary(null);
      setAiSummaryError(null);
      setOverallStatusMessage("Generating AI summary...");
      setIsInitialProcessingCompleteForSubmit(false);

      try {
        const currentFormData = formDataRef.current;
        const cleanFormDataForSummary = { ...currentFormData };
        const summaryResponse = await fetch('/api/generate-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanFormDataForSummary),
        });
        const summaryData = await summaryResponse.json();
        if (!summaryResponse.ok) throw new Error(summaryData.error || `AI summary failed (Status: ${summaryResponse.status})`);
        
        setContextAiSummary(summaryData.summary);
        setOverallStatusMessage("AI summary generated. Please choose your next step and submit.");

      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error fetching AI summary.";
        setAiSummaryError(message);
        setOverallStatusMessage(`Error generating AI summary: ${message}`);
      } finally {
        setIsLoadingAiSummary(false);
        setIsInitialProcessingCompleteForSubmit(true); // Mark as complete even if there's an error
        setSummaryProcessCompletedForSession(true);
        isPerformingWorkRef.current = false;
      }
    };

    if (formData.consent && !summaryProcessCompletedForSession) {
      if (!isPerformingWorkRef.current) {
        generateAiSummary();
      }
    } else if (!formData.consent && summaryProcessCompletedForSession) {
      setContextAiSummary(null);
      setAiSummaryError(null);
      setOverallStatusMessage(null);
      setIsInitialProcessingCompleteForSubmit(false);
      setSummaryProcessCompletedForSession(false);
      isPerformingWorkRef.current = false;
    } else if (formData.consent && summaryProcessCompletedForSession && !isInitialProcessingCompleteForSubmit) {
      if (contextAiSummary) {
         setIsInitialProcessingCompleteForSubmit(true);
      }
    }
  }, [
    formData.consent,
    summaryProcessCompletedForSession,
    setContextAiSummary,
    setAiSummaryError,
    setOverallStatusMessage,
    setIsInitialProcessingCompleteForSubmit,
    setSummaryProcessCompletedForSession,
    contextAiSummary
  ]);

  useEffect(() => {
    if (setIsReadyForFinalSubmit) {
      const isReady = isInitialProcessingCompleteForSubmit && !!contextAiSummary && !saveAssessmentError;
      setIsReadyForFinalSubmit(isReady);
    }
  }, [
    isInitialProcessingCompleteForSubmit,
    contextAiSummary,
    saveAssessmentError,
    setIsReadyForFinalSubmit
  ]);

  useEffect(() => {
    if (registerSubmitAction) {
      registerSubmitAction(userInitiatedSend);
    }
    return () => {
      if (registerSubmitAction) {
        registerSubmitAction(undefined);
      }
    };
  }, [registerSubmitAction, userInitiatedSend]);

  const cardBaseClass = "bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden shadow-md";
  const cardHeaderBaseClass = "bg-slate-100 dark:bg-slate-700 px-4 py-3 border-b dark:border-gray-600";
  const cardTitleBaseClass = "font-semibold text-blue-700 dark:text-blue-300";
  const cardContentBaseClass = "p-4 text-gray-700 dark:text-gray-300";
  const listItemBaseClass = "text-gray-600 dark:text-gray-400";

  const renderRedFlags = () => {
    if (!formDataRef.current.redFlags) return <p>No red flag data available.</p>;

    const redFlags = formDataRef.current.redFlags;
    const reportedItems: JSX.Element[] = [];

    const addFlagItem = (label: string, isPresent: boolean, details?: string) => {
      if (isPresent) {
        reportedItems.push(<li key={label} className={listItemBaseClass}>{label}{details ? `: ${details}` : ''}</li>);
      }
    };

    if (redFlags.muscleWeakness?.present && redFlags.muscleWeakness.areas) {
      const selectedAreas = Object.entries(redFlags.muscleWeakness.areas)
        .filter(([, areaDetail]: [string, { selected: boolean; severity?: number }]) => areaDetail.selected)
        .map(([areaName]) => areaName);
      if (selectedAreas.length > 0) {
        addFlagItem('Muscle Weakness', true, selectedAreas.join(', '));
      } else {
         addFlagItem('Muscle Weakness', true, "Present, no specific areas detailed.");
      }
    }

    if (redFlags.numbnessOrTingling?.present && redFlags.numbnessOrTingling.areas) {
      const selectedAreas = Object.entries(redFlags.numbnessOrTingling.areas)
        .filter(([, areaDetail]: [string, { selected: boolean; severity?: number }]) => areaDetail.selected)
        .map(([areaName]) => areaName);
      if (selectedAreas.length > 0) {
        addFlagItem('Numbness Or Tingling', true, selectedAreas.join(', '));
      } else {
        addFlagItem('Numbness Or Tingling', true, "Present, no specific areas detailed.");
      }
    }

    if (redFlags.unexplainedWeightLoss?.present) {
      let uwlDetails = '';
      if (redFlags.unexplainedWeightLoss.amountKg) uwlDetails += `Amount: ${redFlags.unexplainedWeightLoss.amountKg}kg`;
      if (redFlags.unexplainedWeightLoss.period) uwlDetails += `${uwlDetails ? ', ' : ''}Period: ${redFlags.unexplainedWeightLoss.period}`;
      addFlagItem('Unexplained Weight Loss', true, uwlDetails || "Details not specified");
    }

    if (redFlags.bladderOrBowelIncontinence?.present) {
      let bbDetails = '';
      if (redFlags.bladderOrBowelIncontinence.details) {
        bbDetails += `Type: ${redFlags.bladderOrBowelIncontinence.details}`;
      }
      if (redFlags.bladderOrBowelIncontinence.isNewOnset) {
        bbDetails += `${bbDetails ? '; ' : ''}New Onset`;
      }
      addFlagItem('Bladder Or Bowel Incontinence', true, bbDetails || "Details not specified");
    }

    if (redFlags.saddleAnaesthesia?.present) {
      let saDetails = '';
      if (redFlags.saddleAnaesthesia.details) {
        saDetails += `Area: ${redFlags.saddleAnaesthesia.details}`;
      }
      addFlagItem('Saddle Anaesthesia', true, saDetails || "Details not specified");
    }

    if (redFlags.balanceProblems?.present && redFlags.balanceProblems.type && redFlags.balanceProblems.type !== 'My balance feels normal') {
       addFlagItem('Balance Problems', true, redFlags.balanceProblems.type);
    }

    if (redFlags.otherRedFlagPresent && redFlags.otherRedFlag && redFlags.otherRedFlag.trim() !== '') {
      reportedItems.push(<li key="otherRedFlag" className={listItemBaseClass}>Other Red Flags: {redFlags.otherRedFlag}</li>);
    }

    if (reportedItems.length === 0) return <p>No significant red flags reported.</p>;

    return (
      <ul className="list-disc list-inside space-y-1">
        {reportedItems}
      </ul>
    );
  };

  return (
    <div className="step-container bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
      <h2 className="form-title text-gray-800 dark:text-white">Summary: Review and Next Steps</h2>
      <div className="space-y-8">
        <div className={cardBaseClass}>
          <div className={cardHeaderBaseClass}>
            <h3 className={cardTitleBaseClass}>Initial Triage: Report and Summary</h3>
          </div>
          <div className={`${cardContentBaseClass} min-h-[100px] flex flex-col justify-center items-center`}>
            {isLoadingAiSummary && !contextAiSummary && !aiSummaryError && (
              <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <span className="mr-2 text-lg">Generating AI summary</span>
                  <span className="thinking-dot bg-gray-500 dark:bg-gray-400 thinking-dot-delay-1"></span>
                  <span className="thinking-dot bg-gray-500 dark:bg-gray-400 thinking-dot-delay-2 mx-0.5"></span>
                  <span className="thinking-dot bg-gray-500 dark:bg-gray-400"></span>
                </div>
                <p className="text-xs mt-2">This may take a moment...</p>
              </div>
            )}
            {aiSummaryError && !isLoadingAiSummary && <p className="text-red-500 dark:text-red-400 text-center">AI Summary Error: {aiSummaryError}</p>}
            {contextAiSummary && !isLoadingAiSummary && <p className="whitespace-pre-wrap w-full">{contextAiSummary}</p>}
            {!formData.consent && <p className="text-center">Consent must be provided on the first step to generate summary.</p>}
            {formData.consent && !contextAiSummary && !isLoadingAiSummary && !aiSummaryError && <p className="text-center">AI Summary will be generated automatically.</p>}
          </div>
        </div>

        <div className={cardBaseClass}>
            <div className={cardHeaderBaseClass}><h3 className={cardTitleBaseClass}>Red Flag Symptoms</h3></div>
            <div className={cardContentBaseClass}>
              {renderRedFlags()}
            </div>
        </div>

        {formDataRef.current.treatmentGoals && (
          <div className={cardBaseClass}>
            <div className={cardHeaderBaseClass}><h3 className={cardTitleBaseClass}>Your Treatment Goals</h3></div>
            <div className={cardContentBaseClass}><p className="whitespace-pre-wrap">{formDataRef.current.treatmentGoals}</p></div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          { (formData.painMapImageFront || formData.painMapImageBack) && (
            <div className={`${cardBaseClass} md:col-span-2`}>
              <div className={cardHeaderBaseClass}><h3 className={cardTitleBaseClass}>Pain Map Images</h3></div>
              <div className={`${cardContentBaseClass} flex justify-around`}>
                {formData.painMapImageFront && (
                  <div className="text-center">
                    <h4 className="font-semibold mb-2">Front View</h4>
                    <img src={`${import.meta.env.VITE_SERVER_BASE_URL}/uploads/assessment_files/${formData.painMapImageFront}`} alt="Pain Map Front" className="max-w-xs rounded-lg shadow-md" />
                  </div>
                )}
                {formData.painMapImageBack && (
                  <div className="text-center">
                    <h4 className="font-semibold mb-2">Back View</h4>
                    <img src={`${import.meta.env.VITE_SERVER_BASE_URL}/uploads/assessment_files/${formData.painMapImageBack}`} alt="Pain Map Back" className="max-w-xs rounded-lg shadow-md" />
                  </div>
                )}
              </div>
            </div>
          )}
          <div className={cardBaseClass}>
            <div className={cardHeaderBaseClass}><h3 className={cardTitleBaseClass}>Pain Evaluation</h3></div>
            <div className={cardContentBaseClass}>
              {formDataRef.current.painAreas.length > 0 ? (
                <div>
                  <div className="flex items-center mb-4">
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-4">
                      <div className={`h-4 rounded-full ${ highestPainIntensity <= 3 ? 'bg-green-500' : highestPainIntensity <= 6 ? 'bg-yellow-500' : 'bg-red-500' }`} style={{ width: `${(highestPainIntensity / 10) * 100}%` }} ></div>
                    </div>
                    <span className="ml-3 font-bold">{highestPainIntensity}/10</span>
                  </div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Affected Areas:</h4>
                  <ul className="list-inside space-y-1">
                    {formDataRef.current.painAreas.map((area, index) => ( <li key={index} className={`${listItemBaseClass} flex justify-between`}><span>{area.region}</span><span className="font-medium">{area.intensity}/10</span></li>))}
                  </ul>
                </div>
              ) : (<p>No pain areas reported.</p>)}
            </div>
          </div>
          <div className={cardBaseClass}>
            <div className={cardHeaderBaseClass}><h3 className={cardTitleBaseClass}>Medical Conditions & Symptoms</h3></div>
            <div className={cardContentBaseClass}>
              {(Object.values(formDataRef.current.diagnoses).some(val => val === true || (typeof val === 'string' && val.length > 0))) ? (
                <ul className="list-disc list-inside space-y-1">
                  {formDataRef.current.diagnoses.herniatedDisc && <li className={listItemBaseClass}>Herniated Disc</li>}
                  {formDataRef.current.diagnoses.spinalStenosis && <li className={listItemBaseClass}>Spinal Stenosis</li>}
                  {formDataRef.current.diagnoses.spondylolisthesis && <li className={listItemBaseClass}>Spondylolisthesis</li>}
                  {formDataRef.current.diagnoses.scoliosis && <li className={listItemBaseClass}>Scoliosis</li>}
                  {formDataRef.current.diagnoses.spinalFracture && <li className={listItemBaseClass}>Spinal Fracture</li>}
                  {formDataRef.current.diagnoses.degenerativeDiscDisease && <li className={listItemBaseClass}>Degenerative Disc Disease</li>}
                  {formDataRef.current.diagnoses.otherConditionSelected && formDataRef.current.diagnoses.other && <li className={listItemBaseClass}>Other: {formDataRef.current.diagnoses.other}</li>}
                  {!formDataRef.current.diagnoses.otherConditionSelected && formDataRef.current.diagnoses.other && <li className={listItemBaseClass}>Other (not primary): {formDataRef.current.diagnoses.other}</li>}
                  {formDataRef.current.diagnoses.mainSymptoms && <li className={`${listItemBaseClass} mt-2`}><span className="font-medium">Main Symptoms:</span> {formDataRef.current.diagnoses.mainSymptoms}</li>}
                  {formDataRef.current.diagnoses.symptomDuration && <li className={listItemBaseClass}><span className="font-medium">Symptom Duration:</span> {formDataRef.current.diagnoses.symptomDuration}</li>}
                  {formDataRef.current.diagnoses.symptomProgression && <li className={listItemBaseClass}><span className="font-medium">Symptom Progression:</span> {formDataRef.current.diagnoses.symptomProgression}</li>}
                </ul>
              ) : (<p>No specific conditions or symptoms reported.</p>)}
            </div>
          </div>
          <div className={cardBaseClass}>
            <div className={cardHeaderBaseClass}><h3 className={cardTitleBaseClass}>Treatment History</h3></div>
            <div className={cardContentBaseClass}>
              <div className="mb-3">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Non-Surgical Treatments:</h4>
                {Object.entries(formDataRef.current.treatments).filter(([key, value]) => !key.includes('Name') && !key.includes('Details') && value === true).length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(formDataRef.current.treatments).map(([key, value]) => {
                      if (key.includes('Name') || key.includes('Details') || value !== true) return null;
                      const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      let details = '';
                      if (key === 'prescriptionAntiInflammatory' && formDataRef.current.treatments.prescriptionAntiInflammatoryName) details = `: ${formDataRef.current.treatments.prescriptionAntiInflammatoryName}`;
                      else if (key === 'prescriptionPainMedication' && formDataRef.current.treatments.prescriptionPainMedicationName) details = `: ${formDataRef.current.treatments.prescriptionPainMedicationName}`;
                      else if (key === 'spinalInjections' && formDataRef.current.treatments.spinalInjectionsDetails) details = `: ${formDataRef.current.treatments.spinalInjectionsDetails}`;
                      return <li key={key} className={listItemBaseClass}>{readableKey}{details}</li>;
                    })}
                  </ul>
                ) : ( <p>No non-surgical treatments reported.</p> )}
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Surgical History:</h4>
                {formDataRef.current.hadSurgery && formDataRef.current.surgeries.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {formDataRef.current.surgeries.map((surgery, index) => (<li key={index} className={listItemBaseClass}> {surgery.procedure} ({formatDate(surgery.date)})</li>))}
                  </ul>
                ) : ( <p>No surgical history reported.</p> )}
              </div>
            </div>
          </div>
          <div className={cardBaseClass}>
            <div className={cardHeaderBaseClass}><h3 className={cardTitleBaseClass}>Imaging History</h3></div>
            <div className={cardContentBaseClass}>
              {formDataRef.current.imaging.some(img => img.hadStudy) ? (
                <ul className="list-disc list-inside space-y-1">
                  {formDataRef.current.imaging.filter(img => img.hadStudy).map((img, index) => (
                    <li key={index} className={listItemBaseClass}>
                      {img.type} {img.date && `(${formatDate(img.date)})`} {img.clinic && ` at ${img.clinic}`}
                      {img.documentName && (
                        <a
                          href={`${import.meta.env.VITE_SERVER_BASE_URL}/uploads/assessment_files/${img.documentName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          (View Uploaded Document)
                        </a>
                      )}
                      {!img.documentName && (
                        <span className="ml-2 text-gray-400">(Document link not available)</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : ( <p>No imaging studies reported.</p> )}
            </div>
          </div>
        </div>
        <div className={cardBaseClass}>
          <div className={cardHeaderBaseClass}><h3 className={cardTitleBaseClass}>Personal Information</h3></div>
          <div className={`${cardContentBaseClass} grid grid-cols-1 md:grid-cols-2 gap-4`}>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p><p className="font-medium">{formDataRef.current.demographics.fullName}</p></div>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p><p className="font-medium">{formatDate(formDataRef.current.demographics.dateOfBirth)}</p></div>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Contact Number</p><p className="font-medium">{formDataRef.current.demographics.phoneNumber}</p></div>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Email</p><p className="font-medium">{formDataRef.current.demographics.email}</p></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Residential Address</p>
              <p className="font-medium">
                {formDataRef.current.demographics.residentialAddress.addressLine1}
                {formDataRef.current.demographics.residentialAddress.addressLine2 && `, ${formDataRef.current.demographics.residentialAddress.addressLine2}`}
                , {formDataRef.current.demographics.residentialAddress.suburb}, {formDataRef.current.demographics.residentialAddress.state} {formDataRef.current.demographics.residentialAddress.postcode}
              </p>
            </div>
            {!formDataRef.current.demographics.isPostalSameAsResidential && formDataRef.current.demographics.postalAddress && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Postal Address</p>
                <p className="font-medium">
                  {formDataRef.current.demographics.postalAddress.addressLine1}
                  {formDataRef.current.demographics.postalAddress.addressLine2 && `, ${formDataRef.current.demographics.postalAddress.addressLine2}`}
                  , {formDataRef.current.demographics.postalAddress.suburb}, {formDataRef.current.demographics.postalAddress.state} {formDataRef.current.demographics.postalAddress.postcode}
                </p>
              </div>
            )}
            {formDataRef.current.demographics.funding && formDataRef.current.demographics.funding.source && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Funding Source</p>
                <p className="font-medium">{formDataRef.current.demographics.funding.source}</p>
                {formDataRef.current.demographics.funding.source === 'Private Health Insurance' && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Health Fund</p>
                    <p className="font-medium">{formDataRef.current.demographics.funding.healthFundName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Membership Number</p>
                    <p className="font-medium">{formDataRef.current.demographics.funding.membershipNumber}</p>
                  </>
                )}
                {['Workers Compensation', 'DVA', 'TAC'].includes(formDataRef.current.demographics.funding.source) && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Claim/Reference Number</p>
                    <p className="font-medium">{formDataRef.current.demographics.funding.claimNumber || 'N/A'}</p>
                  </>
                )}
                {formDataRef.current.demographics.funding.source === 'Other' && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Other Funding Source</p>
                    <p className="font-medium">{formDataRef.current.demographics.funding.otherSource || 'N/A'}</p>
                  </>
                )}
              </div>
            )}
            {formDataRef.current.demographics.nextOfKin.fullName && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Emergency Contact</p>
                <p className="font-medium">{formDataRef.current.demographics.nextOfKin.fullName} ({formDataRef.current.demographics.nextOfKin.relationship}) - {formDataRef.current.demographics.nextOfKin.phoneNumber}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Referring Doctor</p>
              {formDataRef.current.demographics.referringDoctor.hasReferringDoctor === true && (
                <p className="font-medium">
                  {formDataRef.current.demographics.referringDoctor.doctorName}, {formDataRef.current.demographics.referringDoctor.clinic}, {formDataRef.current.demographics.referringDoctor.phoneNumber}, {formDataRef.current.demographics.referringDoctor.email}, {formDataRef.current.demographics.referringDoctor.fax}
                </p>
              )}
              {formDataRef.current.demographics.referringDoctor.hasReferringDoctor === false && (
                <p className="font-medium">No</p>
              )}
            </div>
            {formDataRef.current.demographics.gender && (
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Gender</p><p className="font-medium">{formDataRef.current.demographics.gender}</p></div>
            )}
            {formDataRef.current.demographics.medicareNumber && (
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Medicare Number</p><p className="font-medium">{formDataRef.current.demographics.medicareNumber}</p></div>
            )}
            {formDataRef.current.demographics.medicareRefNum && (
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Medicare Ref. No.</p><p className="font-medium">{formDataRef.current.demographics.medicareRefNum}</p></div>
            )}
            {formDataRef.current.demographics.countryOfBirth && (
              <div><p className="text-sm text-gray-500 dark:text-gray-400">Country of Birth</p><p className="font-medium">{formDataRef.current.demographics.countryOfBirth}</p></div>
            )}
            {/* Display Imaging Records Permission */}
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Permission to Request Imaging Records</p>
              <p className="font-medium">{formDataRef.current.imagingRecordsPermission ? 'Yes, permission granted' : 'No, permission not granted'}</p>
            </div>
          </div>
        </div>

        {!formData.consent && isInitialProcessingCompleteForSubmit && <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-right">Consent must be provided on the first step to generate summary and enable submission.</p>}
        {isInitialProcessingCompleteForSubmit && !!saveAssessmentError && <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-right">Cannot proceed to email due to an error saving the evaluation. Please try refreshing or contact support.</p>}

        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <h3 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>We recommend the following:</h3>
          <div className="space-y-4">
            <div className={`p-4 rounded-md ${theme === 'dark' ? 'bg-slate-600' : 'bg-white shadow-sm'}`}>
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Review your summary with your GP or specialist</h4>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Bring this report to any upcoming appointments to assist with diagnosis and planning.</p>
            </div>
            <div className={`p-4 rounded-md ${theme === 'dark' ? 'bg-slate-600' : 'bg-white shadow-sm'}`}>
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Monitor your symptoms</h4>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Keep track of any changes or new symptoms. This information can help guide further care.</p>
            </div>
            <div className={`p-4 rounded-md ${theme === 'dark' ? 'bg-slate-600' : 'bg-white shadow-sm'}`}>
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>If any red flags were identified, our team will reach out urgently</h4>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Your responses are reviewed for signs of serious conditions. If urgent concerns are detected, we will contact you directly to prioritise care.</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <h3 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>What would you like to do next?</h3>
          <div className="space-y-4">
            <div className={getNextStepSuggestion() === 'Referral for imaging' ? 'p-4 border-2 border-sky-500 rounded-lg' : ''}>
              <label className="flex items-center">
                <input type="radio" name="nextStep" value="Referral for imaging" onChange={(e) => updateFormData({ nextStep: e.target.value })} className="form-radio h-4 w-4 text-sky-600 accent-sky-500 focus:ring-sky-500" />
                <span className="ml-2">Referral for imaging (e.g., MRI, CT, X-ray)</span>
              </label>
              <ul className="list-disc list-inside pl-6 text-sm text-gray-600 dark:text-gray-400">
                <li>You have not had imaging related to your condition</li>
                <li>Your last imaging is older than 9 months</li>
                <li>Your symptoms have changed or worsened since your last scan</li>
                <li>You're experiencing new neurological symptoms (e.g., numbness, weakness)</li>
              </ul>
            </div>
            <div className={getNextStepSuggestion() === 'Referral to Allied Health' ? 'p-4 border-2 border-sky-500 rounded-lg' : ''}>
              <label className="flex items-center">
                <input type="radio" name="nextStep" value="Referral to Allied Health" onChange={(e) => updateFormData({ nextStep: e.target.value })} className="form-radio h-4 w-4 text-sky-600 accent-sky-500 focus:ring-sky-500" />
                <span className="ml-2">Referral to Allied Health (e.g., Physiotherapy, Exercise Physiology)</span>
              </label>
              <ul className="list-disc list-inside pl-6 text-sm text-gray-600 dark:text-gray-400">
                <li>You are recovering from an injury or surgery</li>
                <li>You have ongoing symptoms affecting mobility or function</li>
                <li>You have not trialled conservative treatment like physiotherapy or rehab</li>
                <li>You would like help managing your condition without surgery</li>
              </ul>
            </div>
            <div className={getNextStepSuggestion() === 'Book a Specialist Appointment' ? 'p-4 border-2 border-sky-500 rounded-lg' : ''}>
              <label className="flex items-center">
                <input type="radio" name="nextStep" value="Book a Specialist Appointment" onChange={(e) => updateFormData({ nextStep: e.target.value })} className="form-radio h-4 w-4 text-sky-600 accent-sky-500 focus:ring-sky-500" />
                <span className="ml-2">Book a Specialist Appointment</span>
              </label>
              <ul className="list-disc list-inside pl-6 text-sm text-gray-600 dark:text-gray-400">
                <li>You've already had imaging and/or allied health support, but symptoms persist</li>
                <li>You were referred by a GP or another specialist</li>
                <li>Your condition is interfering with daily life or work</li>
                <li>Your evaluation suggests possible surgical intervention or specialist care</li>
              </ul>
            </div>
            <div className={getNextStepSuggestion() === 'No Immediate Action Needed' ? 'p-4 border-2 border-sky-500 rounded-lg' : ''}>
              <label className="flex items-center">
                <input type="radio" name="nextStep" value="No Immediate Action Needed" onChange={(e) => updateFormData({ nextStep: e.target.value })} className="form-radio h-4 w-4 text-sky-600 accent-sky-500 focus:ring-sky-500" />
                <span className="ml-2">No Immediate Action Needed</span>
              </label>
              <ul className="list-disc list-inside pl-6 text-sm text-gray-600 dark:text-gray-400">
                <li>You are just reviewing your results for now</li>
                <li>You are already under care or awaiting treatment</li>
                <li>You prefer to discuss next steps with your regular doctor first</li>
              </ul>
            </div>
          </div>
        </div>

        {/* MOVED STATUS MESSAGES HERE */}
        <div className="mt-6 space-y-2">
          {overallStatusMessage && (
             <div className={`p-3 rounded-md text-sm ${
              (aiSummaryError || saveAssessmentError || sendEmailError)
                ? (theme === 'dark' ? 'bg-red-700/30 border border-red-500/50 text-red-200' : 'bg-red-100 border border-red-500 text-red-800')
                : (theme === 'dark' ? 'bg-blue-800/30 border border-blue-600/50 text-blue-200' : 'bg-blue-50 border border-blue-300 text-blue-800')
            }`}>
              {overallStatusMessage}
            </div>
          )}
          {isSavingAssessment && !saveAssessmentSuccess && !saveAssessmentError && <p className="text-sm text-blue-600 dark:text-blue-400">Saving evaluation data...</p>}

          {saveAssessmentSuccess && !sendEmailSuccess && !sendEmailError && (
            <div className={`p-3 rounded-md text-sm ${theme === 'dark' ? 'bg-green-700/30 border border-green-500/50 text-green-200' : 'bg-green-100 border border-green-500 text-green-800'}`}>
              {saveAssessmentSuccess}
            </div>
          )}
          {sendEmailSuccess && (
            <div className={`p-3 rounded-md text-sm ${theme === 'dark' ? 'bg-green-700/30 border border-green-500/50 text-green-200' : 'bg-green-100 border border-green-500 text-green-800'}`}>
              {sendEmailSuccess}
            </div>
          )}
          {sendEmailError && (
            <div className={`p-3 rounded-md text-sm ${theme === 'dark' ? 'bg-red-700/30 border border-red-500/50 text-red-200' : 'bg-red-100 border border-red-500 text-red-800'}`}>
              Email Sending Error: {sendEmailError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;

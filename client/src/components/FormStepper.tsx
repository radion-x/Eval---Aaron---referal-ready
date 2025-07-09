import React, { useState, useRef } from 'react';
import { useFormContext } from '../context/FormContext';
import StepNavigator from './StepNavigator';
import OnboardingStep from './steps/OnboardingStep';
import ClinicalHistoryStep from './steps/ClinicalHistoryStep'; // Renamed from MedicalHistoryStep
import ImagingHistoryStep from './steps/ImagingHistoryStep'; // Moved up
import TreatmentHistoryStep from './steps/TreatmentHistoryStep'; // Renamed from TreatmentsStep
import PainMappingStep from './steps/PainMappingStep';
import AboutYouStep from './steps/AboutYouStep'; // Renamed from DemographicsStep
import SummaryStep from './steps/SummaryStep';

const FormStepper: React.FC = () => {
  const { currentStep, goToNextStep, goToPrevStep, isStepValid, submitActionRef, formData, isReadyForFinalSubmit, isSubmissionSuccessful } = useFormContext(); // Added isSubmissionSuccessful
  const [isSubmittingFinalStep, setIsSubmittingFinalStep] = useState(false); // Local state for button's own "processing" visual
  const painMappingStepRef = useRef<{ captureBothViews: () => Promise<void> }>(null);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <OnboardingStep />;
      case 2:
        return <ClinicalHistoryStep />;
      case 3:
        return <ImagingHistoryStep />;
      case 4:
        return <TreatmentHistoryStep />;
      case 5:
        return <PainMappingStep ref={painMappingStepRef} />;
      case 6:
        return <AboutYouStep />;
      case 7:
        return <SummaryStep />;
      default:
        return <OnboardingStep />;
    }
  };

  return (
    <div>
      {currentStep === 1 && (
        <header className="mb-8 text-center pt-8"> {/* Reduced padding-top and margin-bottom */}
          <h1 className="text-6xl font-bold mb-2 text-gray-900 dark:text-white">Spine IQ</h1> {/* Reduced margin-bottom */}
          <p className="text-2xl font-light text-gray-700 dark:text-neutral-300">The Backbone of Intelligent Care</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">by Prof. Aaron Buckland</p>
        </header>
      )}
      {currentStep > 1 && <StepNavigator currentStep={currentStep} />}
      
      <div className="mt-8">
        {renderStep()}
      </div>
      
      <div className="mt-8 flex justify-between">
        {currentStep > 1 && (
          <button 
            className="btn-secondary"
            onClick={goToPrevStep}
          >
            Back
          </button>
        )}
        
        {currentStep < 7 && (
          <button 
            className={`btn-primary ml-auto ${!isStepValid(currentStep) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={async () => {
              if (currentStep === 5 && painMappingStepRef.current) {
                await painMappingStepRef.current.captureBothViews();
              }
              goToNextStep();
            }}
            disabled={!isStepValid(currentStep)}
          >
            Continue
          </button>
        )}
        
        {currentStep === 7 && (
          <button 
            className={`btn-primary ml-auto ${
              isSubmissionSuccessful 
                ? 'bg-green-500 hover:bg-green-600 cursor-not-allowed' 
                : (!submitActionRef?.current || isSubmittingFinalStep || !formData.consent || !isReadyForFinalSubmit) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
            }`}
            onClick={async () => {
              if (isSubmissionSuccessful) return; // Do nothing if already submitted
              if (submitActionRef?.current && formData.consent && isReadyForFinalSubmit && !isSubmittingFinalStep) {
                setIsSubmittingFinalStep(true);
                try {
                  await submitActionRef.current(); // Call the function from the ref
                  // Success/error messages are primarily handled within SummaryStep's states
                  // This button just triggers and shows its own "Processing..."
                } catch (error) {
                  // This catch is for errors in submitActionRef.current promise itself, if not caught by SummaryStep
                  console.error("Error during FormStepper's call to submitActionRef.current:", error);
                  alert("An unexpected error occurred during submission. Please check the summary details.");
                }
                setIsSubmittingFinalStep(false);
              } else if (!formData.consent) {
                alert("Please provide consent on the first step to submit.");
              } else if (!isReadyForFinalSubmit) {
                alert("The system is not ready for submission. Please ensure AI summary and data saving are complete, or check for errors on the page.");
              }
            }}
            disabled={isSubmissionSuccessful || !submitActionRef?.current || isSubmittingFinalStep || !formData.consent || !isReadyForFinalSubmit}
          >
            {isSubmissionSuccessful ? 'Evaluation Submitted' : isSubmittingFinalStep ? 'Processing Email...' : 'Submit Evaluation'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FormStepper;

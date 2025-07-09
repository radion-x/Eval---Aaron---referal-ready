import React, { createContext, useContext, useState, ReactNode, useRef } from 'react'; // Added useRef
import { FormData, initialFormData } from '../data/formData';

interface FormContextType {
  formData: FormData;
  currentStep: number;
  updateFormData: (stepData: Partial<FormData>) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  goToStep: (step: number) => void;
  isStepValid: (step: number) => boolean;
  // submitAction?: () => Promise<void>; // Optional: for the final step's custom action
  // setSubmitAction?: (handler: (() => Promise<void>) | undefined) => void; // To register the action
  submitActionRef?: React.MutableRefObject<(() => Promise<void>) | undefined>;
  registerSubmitAction?: (handler: (() => Promise<void>) | undefined) => void;
  isReadyForFinalSubmit?: boolean;
  setIsReadyForFinalSubmit?: (isReady: boolean) => void;
  formSessionId: string; // To uniquely identify this form session for uploads
  summaryProcessCompletedForSession: boolean;
  setSummaryProcessCompletedForSession: (completed: boolean) => void;
  
  // States lifted for SummaryStep stability
  aiSummary: string | null;
  setAiSummary: (summary: string | null) => void;
  isInitialProcessingCompleteForSubmit: boolean;
  setIsInitialProcessingCompleteForSubmit: (complete: boolean) => void;
  isSubmissionSuccessful: boolean;
  setIsSubmissionSuccessful: (isSuccess: boolean) => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

interface FormProviderProps {
  children: ReactNode;
}

export const FormProvider: React.FC<FormProviderProps> = ({ children }) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  // const [submitActionHandler, setSubmitActionHandler] = useState<(() => Promise<void>) | undefined>(undefined);
  const submitActionHandlerRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [isReadyForEmailSubmit, setIsReadyForEmailSubmit] = useState<boolean>(false);
  const [formSessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const [summaryProcessCompleted, setSummaryProcessCompleted] = useState<boolean>(false);
  const [contextAiSummary, setContextAiSummary] = useState<string | null>(null);
  const [contextIsInitialProcessingComplete, setContextIsInitialProcessingComplete] = useState<boolean>(false);
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState<boolean>(false);
  const totalSteps = 7;

  const updateFormData = (stepData: Partial<FormData>) => {
    setFormData(prevData => ({
      ...prevData,
      ...stepData
    }));
  };

  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prevStep => prevStep + 1);
    } else if (currentStep === totalSteps && submitActionHandlerRef.current) {
      // If on the last step and a submit action is registered, execute it.
      // Note: FormStepper will handle its own button logic, this is a fallback or alternative.
      // For this task, FormStepper will directly use submitActionHandlerRef.current.
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prevStep => prevStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: // Onboarding
        return formData.consent === true; // Explicitly check for true
      case 2: // Medical History
        return true; // All fields are optional
      case 3: // Treatments & Surgery History
        return true; // All fields are optional
      case 4: // Imaging History
        return true; // All fields are optional
      case 5: // Pain Mapping
        return formData.painAreas.length > 0;
      case 6: { // Demographics
        const { residentialAddress, isPostalSameAsResidential, postalAddress, funding } = formData.demographics;
        const isResidentialValid = !!residentialAddress.addressLine1 &&
                                 !!residentialAddress.suburb &&
                                 !!residentialAddress.state &&
                                 !!residentialAddress.postcode;
        
        let isPostalValid = true;
        if (!isPostalSameAsResidential) {
          isPostalValid = !!postalAddress?.addressLine1 &&
                          !!postalAddress?.suburb &&
                          !!postalAddress?.state &&
                          !!postalAddress?.postcode;
        }

        let isFundingValid = true;
        if (funding.source === 'Private Health Insurance') {
          isFundingValid = !!funding.healthFundName && !!funding.membershipNumber;
        } else if (funding.source === 'Other') {
          isFundingValid = !!funding.otherSource;
        }

        const { nextOfKin, referringDoctor } = formData.demographics;
        const isNextOfKinValid = !!nextOfKin.fullName && !!nextOfKin.relationship && !!nextOfKin.phoneNumber;
        
        let isReferringDoctorValid = true;
        if (referringDoctor.hasReferringDoctor === true) {
          isReferringDoctorValid = !!referringDoctor.doctorName && !!referringDoctor.clinic && !!referringDoctor.phoneNumber && !!referringDoctor.email;
        }

        return !!formData.demographics.fullName && 
               !!formData.demographics.dateOfBirth && 
               !!formData.demographics.phoneNumber && 
               !!formData.demographics.email &&
               isResidentialValid &&
               isPostalValid &&
               isFundingValid &&
               isNextOfKinValid &&
               isReferringDoctorValid;
      }
      case 7: // Summary
        return true; // Just a summary
      default:
        return false;
    }
  };

  return (
    <FormContext.Provider
      value={{
        formData,
        currentStep,
        updateFormData,
        goToNextStep,
        goToPrevStep,
        goToStep,
        isStepValid,
        // submitAction: submitActionHandler,
        // setSubmitAction: setSubmitActionHandler,
        submitActionRef: submitActionHandlerRef,
        registerSubmitAction: (handler) => { submitActionHandlerRef.current = handler; },
        isReadyForFinalSubmit: isReadyForEmailSubmit,
        setIsReadyForFinalSubmit: setIsReadyForEmailSubmit,
        formSessionId,
        summaryProcessCompletedForSession: summaryProcessCompleted,
        setSummaryProcessCompletedForSession: setSummaryProcessCompleted,
        aiSummary: contextAiSummary,
        setAiSummary: setContextAiSummary,
        isInitialProcessingCompleteForSubmit: contextIsInitialProcessingComplete,
        setIsInitialProcessingCompleteForSubmit: setContextIsInitialProcessingComplete,
        isSubmissionSuccessful,
        setIsSubmissionSuccessful
      }}
    >
      {children}
    </FormContext.Provider>
  );
};

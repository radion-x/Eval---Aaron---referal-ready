import React from 'react';
import { useFormContext } from '../context/FormContext';
import { CheckCircle, Brain, FileText, Syringe, Image, Activity, User, FileCheck } from 'lucide-react';

interface StepNavigatorProps {
  currentStep: number;
}

const StepNavigator: React.FC<StepNavigatorProps> = ({ currentStep }) => {
  const { goToStep, isStepValid } = useFormContext();
  
  const steps = [
    { id: 1, name: 'Onboarding', description: 'Start here', icon: Brain },
    { id: 2, name: 'Clinical History', description: 'Past diagnoses', icon: FileText },
    { id: 3, name: 'Imaging', description: 'Previous scans', icon: Image }, // Was Treatments, now Imaging History (short name 'Imaging')
    { id: 4, name: 'Treatment History', description: "What's been done", icon: Syringe }, // Was Imaging, now Treatment History
    { id: 5, name: 'Pain Mapping', description: 'Show us where it hurts', icon: Activity },
    { id: 6, name: 'About You', description: 'Basic info', icon: User },
    { id: 7, name: 'Summary', description: 'Review & Next Steps', icon: FileCheck },
  ];

  const handleStepClick = (step: number) => {
    if (step < currentStep || (step === currentStep + 1 && isStepValid(currentStep))) {
      goToStep(step);
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      {/* Added flex and justify-center to center the steps container if it's narrower than parent */}
      <div className="min-w-max flex justify-center"> 
        <div className="flex space-x-4"> {/* This container holds the actual steps */}
          {steps.map((step, index) => {
            const isCompleted = step.id < currentStep && isStepValid(step.id);
            const isActive = step.id === currentStep;
            const isClickable = step.id < currentStep || (step.id === currentStep + 1 && isStepValid(currentStep));
            const Icon = step.icon;
            
            return (
              <div 
                key={step.id}
                className={`flex flex-col items-center ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'} min-w-[140px]`}
                onClick={() => handleStepClick(step.id)}
              >
                <div className="relative mb-2">
                  <div 
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                      ${isCompleted ? 'bg-[#8450DE]' : isActive ? 'bg-[#3A55FF]' : 'bg-neutral-200'}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div 
                      className={`absolute top-1/2 left-full w-[calc(140px-3rem)] h-0.5 -translate-y-1/2
                        ${step.id < currentStep ? 'bg-[#8450DE]' : 'bg-neutral-200'}`}
                    />
                  )}
                </div>
                
                <div className="text-center">
                  <div className={`font-semibold ${isActive ? 'text-[#3A55FF]' : 'text-neutral-700'}`}>
                    {step.name}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepNavigator;

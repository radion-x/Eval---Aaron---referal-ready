import React from 'react';
import { useFormContext } from '../../context/FormContext';

const OnboardingStep: React.FC = () => {
  const { formData, updateFormData } = useFormContext();

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ consent: e.target.checked });
  };

  const evaluationSteps = [
    { title: "Onboarding", description: "Getting started" },
    { title: "Clinical History", description: "Understanding your diagnoses" },
    { title: "Imaging History", description: "Documenting previous studies" },
    { title: "Treatment History", description: "Reviewing past interventions" },
    { title: "Pain Mapping", description: "Identifying your pain points" },
    { title: "About You", description: "Basic personal information" },
    { title: "Summary", description: "Review and Next Steps" },
  ];

  return (
    <div className="step-container bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl max-w-2xl mx-auto"> {/* Enhanced card style */}
      
      <div className="mb-8 pt-6">
        <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2"> {/* Changed color, increased prominence */}
          Comprehensive Spine Evaluation
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          This evaluation will help us understand your spine health and provide appropriate guidance through a structured process.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Evaluation Process</h3>
        <ol className="list-decimal list-inside space-y-3 text-gray-700 dark:text-gray-300">
          {evaluationSteps.map((step, index) => (
            <li key={index} className="pl-2">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{step.title}:</span> {step.description}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700 p-6 rounded-lg shadow"> {/* More prominent consent area */}
        <div className="flex items-start">
          <input 
            type="checkbox" 
            id="consent" 
            className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-400 rounded" /* Larger, different border */
            checked={formData.consent}
            onChange={handleConsentChange}
          />
          <label htmlFor="consent" className="ml-3 block text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-tight"> {/* Adjusted label styling */}
            I consent to providing my medical information for the purpose of this evaluation. I understand that this information will be handled according to the <a href="#" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 font-medium">Privacy Policy</a>.
          </label>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep;

import React from 'react';
import { useFormContext } from '../context/FormContext';
import { Brain, Shield, ClipboardCheck } from 'lucide-react';

const OnboardingStep: React.FC = () => {
  const { formData, updateFormData } = useFormContext();

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ consent: e.target.checked });
  };

  return (
    <div className="step-container">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-[#131313] dark:text-white mb-4">
          Welcome to Your Spine Evaluation
        </h2>
        <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
          Let's work together to understand your spine health and create a personalized care pathway.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-neutral-100 dark:border-gray-700">
          <div className="w-12 h-12 bg-[#F5F7FF] dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Brain className="w-6 h-6 text-[#3A55FF] dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#131313] dark:text-white mb-2">Smart Evaluation</h3>
          <p className="text-neutral-600 dark:text-neutral-300">
            Our intelligent system adapts to your responses, ensuring a thorough evaluation of your condition.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-neutral-100 dark:border-gray-700">
          <div className="w-12 h-12 bg-[#F5F7FF] dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-[#3A55FF] dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#131313] dark:text-white mb-2">Secure & Private</h3>
          <p className="text-neutral-600 dark:text-neutral-300">
            Your information is protected with industry-standard encryption and privacy measures.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-neutral-100 dark:border-gray-700">
          <div className="w-12 h-12 bg-[#F5F7FF] dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <ClipboardCheck className="w-6 h-6 text-[#3A55FF] dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#131313] dark:text-white mb-2">Personalized Report</h3>
          <p className="text-neutral-600 dark:text-neutral-300">
            Receive a comprehensive evaluation summary with tailored recommendations.
          </p>
        </div>
      </div>

      <div className="bg-[#F5F7FF] dark:bg-gray-800 rounded-xl p-8 border border-[#3A55FF] dark:border-blue-500 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold text-[#131313] dark:text-white mb-4">
            Before We Begin
          </h3>
          
          <p className="text-neutral-700 dark:text-neutral-300 mb-6">
            This evaluation will take approximately 10-15 minutes to complete. Your responses will help us understand your condition and provide appropriate guidance for your spine health journey.
          </p>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-neutral-200 dark:border-gray-600">
            <label className="flex items-start space-x-4 cursor-pointer group">
              <div className="relative pt-1">
                <input
                  type="checkbox"
                  checked={formData.consent}
                  onChange={handleConsentChange}
                  className="w-5 h-5 border-2 border-neutral-300 dark:border-gray-500 rounded 
                    text-[#3A55FF] focus:ring-[#3A55FF] transition-all duration-300
                    group-hover:border-[#3A55FF] dark:group-hover:border-blue-400"
                />
              </div>
              <div className="flex-1">
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  I consent to providing my medical information for the purpose of this evaluation. 
                  I understand that this information will be handled according to the{' '}
                  <a href="#" className="text-[#3A55FF] dark:text-blue-400 underline hover:text-[#2940CC] dark:hover:text-blue-300">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep;

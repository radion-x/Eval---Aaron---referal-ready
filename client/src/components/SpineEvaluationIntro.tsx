import React from 'react';
import { Brain, FileText, Syringe, Image, Activity, User, FileCheck } from 'lucide-react';

const SpineEvaluationIntro: React.FC = () => {
  const steps = [
    { icon: Brain, title: 'Getting Started', desc: 'Initial evaluation setup' },
    { icon: FileText, title: 'Medical History', desc: 'Past conditions and diagnoses' },
    { icon: Syringe, title: 'Treatment Review', desc: 'Previous interventions' },
    { icon: Image, title: 'Imaging History', desc: 'Past diagnostic studies' },
    { icon: Activity, title: 'Pain Evaluation', desc: 'Current symptoms' },
    { icon: User, title: 'Personal Details', desc: 'Basic information' },
    { icon: FileCheck, title: 'Summary', desc: 'Review and recommendations' }
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-12">
        <p className="text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
          This evaluation helps us understand your history, current pain points, and what kind of help you may need.
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-px bg-neutral-200 dark:bg-gray-700" />
        
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="relative flex items-start group">
              <div className="absolute left-0 w-16 flex justify-center">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-neutral-200 dark:border-gray-700 flex items-center justify-center group-hover:border-[#3A55FF] dark:group-hover:border-blue-400 group-hover:bg-[#F5F7FF] dark:group-hover:bg-gray-700 transition-all duration-300">
                  <step.icon className="w-4 h-4 text-neutral-400 dark:text-gray-500 group-hover:text-[#3A55FF] dark:group-hover:text-blue-400" />
                </div>
              </div>
              
              <div className="ml-20 bg-white dark:bg-gray-800 p-6 rounded-xl border border-neutral-200 dark:border-gray-700 flex-1 group-hover:border-[#3A55FF] dark:group-hover:border-blue-400 group-hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg font-medium text-[#131313] dark:text-white mb-1">
                  {step.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-300">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SpineEvaluationIntro;

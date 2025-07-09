import React, { useState } from 'react';
import { useFormContext } from '../context/FormContext';
import { PainArea } from '../data/formData'; // Import PainArea type
import { RotateCcw } from 'lucide-react';

const BODY_REGIONS = [
  { id: 'neck', name: 'Neck' },
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'upperBack', name: 'Upper Back' },
  { id: 'lowerBack', name: 'Lower Back' },
  { id: 'hips', name: 'Hips' },
  { id: 'legs', name: 'Legs' }
];

const PainMappingStep: React.FC = () => {
  const { formData, updateFormData } = useFormContext();
  const [view, setView] = useState<'front' | 'back'>('front');

  const handleIntensityChange = (region: string, intensity: number) => {
    const existingAreaIndex = formData.painAreas.findIndex((area: PainArea) => area.region === region);
    
    if (existingAreaIndex !== -1) {
      const updatedPainAreas = [...formData.painAreas];
      updatedPainAreas[existingAreaIndex] = {
        ...updatedPainAreas[existingAreaIndex],
        intensity
      };
      updateFormData({ painAreas: updatedPainAreas });
    } else {
      updateFormData({
        painAreas: [...formData.painAreas, {
          id: Date.now().toString(), // Add a unique ID
          region,
          intensity,
          notes: '',
          coordinates: { x: 0, y: 0 } // Add default coordinates
        }]
      });
    }
  };

  const getPainColor = (level: number) => {
    if (level >= 7) return 'bg-[#3A55FF]';
    if (level >= 4) return 'bg-[#8450DE]';
    if (level >= 1) return 'bg-[#04DB64]';
    return 'bg-neutral-200';
  };

  const toggleView = () => {
    setView(view === 'front' ? 'back' : 'front');
  };

  return (
    <div className="step-container">
      <h2 className="text-3xl font-bold text-[#131313] mb-8">Pain Evaluation</h2>
      
      <p className="text-xl text-neutral-800 mb-8">
        Please click on the areas where you are experiencing pain and rate your pain on a scale from 0-10.
      </p>

      <div className="flex flex-col md:flex-row w-full gap-8">
        {/* Body Image + Toggle */}
        <div className="flex flex-col items-center w-full md:w-1/2">
          <button
            onClick={toggleView}
            className="mb-4 inline-flex items-center px-6 py-3 text-lg font-medium rounded-lg border-2 border-[#3A55FF] text-[#3A55FF] hover:bg-[#F5F7FF] transition-all duration-300"
          >
            <RotateCcw className="mr-2" />
            Switch to {view === 'front' ? 'Back' : 'Front'} View
          </button>
          
          <div className="relative w-full max-w-md bg-white p-6 rounded-xl shadow-lg">
            <img 
              src={`https://images.pexels.com/photos/4225880/pexels-photo-4225880.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2`}
              alt={`${view} view of body`}
              className="w-full h-auto object-contain"
              style={{ minHeight: '400px' }}
            />
          </div>
        </div>

        {/* Pain Controls */}
        <div className="flex flex-col gap-4 w-full md:w-1/2">
          {BODY_REGIONS.map(region => (
            <div key={region.id} className="p-6 border rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-[#131313]">{region.name}</h3>
                <span className="text-sm font-medium text-[#3A55FF]">
                  Pain Level: {formData.painAreas.find((area: PainArea) => area.region === region.id)?.intensity || 0}/10
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from({ length: 11 }).map((_, i) => {
                  const isSelected = formData.painAreas.find((area: PainArea) => area.region === region.id)?.intensity === i;
                  return (
                    <button
                      key={i}
                      onClick={() => handleIntensityChange(region.id, i)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                        ${isSelected
                          ? 'border-[#3A55FF] bg-[#3A55FF] text-white shadow-lg'
                          : 'border-neutral-200 hover:border-[#3A55FF] text-neutral-600 hover:text-[#3A55FF]'
                        }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>

              <div className={`h-2 rounded-full ${getPainColor(formData.painAreas.find((area: PainArea) => area.region === region.id)?.intensity || 0)}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PainMappingStep;

import React from 'react';
import { useFormContext } from '../../context/FormContext';
import { Surgery } from '../../data/formData';
import { Trash2 } from 'lucide-react';

const TreatmentHistoryStep: React.FC = () => {
  const { formData, updateFormData } = useFormContext();

  const handleTreatmentChange = (treatment: keyof typeof formData.treatments, value: boolean) => {
    updateFormData({
      treatments: {
        ...formData.treatments,
        [treatment]: value
      }
    });
  };

  const handleTreatmentDetailChange = (treatment: string, value: string) => {
    updateFormData({
      treatments: {
        ...formData.treatments,
        [treatment]: value
      }
    });
  };

  const handleSurgeryChange = (hadSurgery: boolean) => {
    updateFormData({ hadSurgery });
  };

  const addSurgery = () => {
    const newSurgery: Surgery = {
      date: '',
      procedure: '',
      surgeon: '',
      hospital: ''
    };
    
    updateFormData({
      surgeries: [...formData.surgeries, newSurgery]
    });
  };

  const updateSurgery = (index: number, field: keyof Surgery, value: string) => {
    const updatedSurgeries = [...formData.surgeries];
    updatedSurgeries[index] = {
      ...updatedSurgeries[index],
      [field]: value
    };
    
    updateFormData({ surgeries: updatedSurgeries });
  };

  const removeSurgery = (index: number) => {
    const updatedSurgeries = formData.surgeries.filter((_, i) => i !== index);
    updateFormData({ surgeries: updatedSurgeries });
  };

  return (
    <div className="step-container">
      <h2 className="form-title">Treatment History</h2>
      
      <div className="space-y-8">
        <section>
          <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-4">Non-Surgical Treatments</h3>
          <p className="text-slate-700 dark:text-gray-300 mb-4">Select all treatments you have received:</p>
          
          <div className="space-y-4">
            <div className="p-3 border rounded-md hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded"
                  checked={formData.treatments.overTheCounterMedication}
                  onChange={(e) => handleTreatmentChange('overTheCounterMedication', e.target.checked)}
                />
                <span className="ml-2 block text-slate-700 dark:text-gray-300">Over-the-counter Medication</span>
              </label>
            </div>

            <div className="p-3 border rounded-md hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start mb-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded"
                  checked={formData.treatments.prescriptionAntiInflammatory}
                  onChange={(e) => handleTreatmentChange('prescriptionAntiInflammatory', e.target.checked)}
                />
                <span className="ml-2 block text-slate-700 dark:text-gray-300">Prescription Anti-inflammatory Medication</span>
              </div>
              
              {formData.treatments.prescriptionAntiInflammatory && (
                <div className="ml-6 mt-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Medication name"
                    value={formData.treatments.prescriptionAntiInflammatoryName || ''}
                    onChange={(e) => handleTreatmentDetailChange('prescriptionAntiInflammatoryName', e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-3 border rounded-md hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start mb-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded"
                  checked={formData.treatments.prescriptionPainMedication}
                  onChange={(e) => handleTreatmentChange('prescriptionPainMedication', e.target.checked)}
                />
                <span className="ml-2 block text-slate-700 dark:text-gray-300">Prescription Pain Medication</span>
              </div>
              
              {formData.treatments.prescriptionPainMedication && (
                <div className="ml-6 mt-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Medication name"
                    value={formData.treatments.prescriptionPainMedicationName || ''}
                    onChange={(e) => handleTreatmentDetailChange('prescriptionPainMedicationName', e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-3 border rounded-md hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start mb-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded"
                  checked={formData.treatments.spinalInjections}
                  onChange={(e) => handleTreatmentChange('spinalInjections', e.target.checked)}
                />
                <span className="ml-2 block text-slate-700 dark:text-gray-300">Spinal Injections</span>
              </div>
              
              {formData.treatments.spinalInjections && (
                <div className="ml-6 mt-2">
                  <textarea
                    className="w-full h-20 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide details about the injections"
                    value={formData.treatments.spinalInjectionsDetails || ''}
                    onChange={(e) => handleTreatmentDetailChange('spinalInjectionsDetails', e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-3 border rounded-md hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded"
                  checked={formData.treatments.physiotherapy}
                  onChange={(e) => handleTreatmentChange('physiotherapy', e.target.checked)}
                />
                <span className="ml-2 block text-slate-700 dark:text-gray-300">Physiotherapy</span>
              </label>
            </div>

            <div className="p-3 border rounded-md hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded"
                  checked={formData.treatments.chiropracticTreatment}
                  onChange={(e) => handleTreatmentChange('chiropracticTreatment', e.target.checked)}
                />
                <span className="ml-2 block text-slate-700 dark:text-gray-300">Chiropractic Treatment</span>
              </label>
            </div>

            <div className="p-3 border rounded-md hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded"
                  checked={formData.treatments.osteopathyMyotherapy}
                  onChange={(e) => handleTreatmentChange('osteopathyMyotherapy', e.target.checked)}
                />
                <span className="ml-2 block text-slate-700 dark:text-gray-300">Osteopathy/Myotherapy</span>
              </label>
            </div>
          </div>
        </section>

        <section className="pt-4 border-t border-slate-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-4">Spinal Surgery History</h3>
          
          <div className="mb-4">
            <p className="text-slate-700 dark:text-gray-300 mb-3">Have you had previous surgery on your back?</p>
            
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
                  checked={formData.hadSurgery === true}
                  onChange={() => handleSurgeryChange(true)}
                />
                <span className="ml-2 text-slate-700 dark:text-gray-300">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
                  checked={formData.hadSurgery === false}
                  onChange={() => handleSurgeryChange(false)}
                />
                <span className="ml-2 text-slate-700 dark:text-gray-300">No</span>
              </label>
            </div>
          </div>

          {formData.hadSurgery && (
            <div className="mt-4 space-y-6">
              {formData.surgeries.map((surgery, index) => (
                <div key={index} className="p-4 border rounded-md bg-slate-50 dark:bg-gray-700 dark:border-gray-600">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300">Surgery #{index + 1}</h4>
                    <button 
                      type="button" 
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => removeSurgery(index)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={surgery.date}
                        onChange={(e) => updateSurgery(index, 'date', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Procedure</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type of surgery"
                        value={surgery.procedure}
                        onChange={(e) => updateSurgery(index, 'procedure', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Surgeon</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Surgeon name"
                        value={surgery.surgeon}
                        onChange={(e) => updateSurgery(index, 'surgeon', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Hospital</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Hospital name"
                        value={surgery.hospital}
                        onChange={(e) => updateSurgery(index, 'hospital', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={addSurgery}
              >
                + Add Another Surgery
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TreatmentHistoryStep;

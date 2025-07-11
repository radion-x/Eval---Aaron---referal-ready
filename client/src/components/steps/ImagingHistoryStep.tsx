import React, { useState } from 'react';
import { useFormContext } from '../../context/FormContext';
import { Imaging } from '../../data/formData';

// Define a type for individual upload statuses
type UploadStatus = {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
};

const spinalRegions = [
  'Cervical',
  'Thoracic',
  'Lumbar',
  'Sacral',
  'Coccygeal'
];

const ImagingHistoryStep: React.FC = () => {
  const { formData, updateFormData, formSessionId } = useFormContext(); // Added formSessionId
  
  // Local state to manage upload status for each imaging item
  const initialUploadStatuses: UploadStatus[] = formData.imaging.map(() => ({
    isLoading: false,
    error: null,
    successMessage: null,
  }));
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>(initialUploadStatuses);

  const updateImagingField = (index: number, field: keyof Imaging, value: any) => {
    const updatedImaging = formData.imaging.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    updateFormData({ imaging: updatedImaging });
  };

  const handleSpinalRegionChange = (index: number, selectedRegions: string[]) => {
    updateImagingField(index, 'spinalRegions', selectedRegions);
  };
  
  const handleFileChange = async (index: number, file: File | undefined) => {
    if (!file) {
      // If file is cleared, also clear documentName and status
      updateImagingField(index, 'document', undefined);
      updateImagingField(index, 'documentName', undefined);
      setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: false, error: null, successMessage: null } : s));
      return;
    }

    // Update local file object for immediate feedback if needed, though we primarily care about documentName
    updateImagingField(index, 'document', file); 
    
    setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: true, error: null, successMessage: 'Uploading...' } : s));

    const payload = new FormData();
    payload.append('imagingFile', file);
    // The formSessionId is now sent as a query parameter, not in the body
    // payload.append('formSessionId', formSessionId); 

    try {
      // Pass formSessionId as a query parameter
      const response = await fetch(`/api/upload/imaging-file?formSessionId=${encodeURIComponent(formSessionId)}`, {
        method: 'POST',
        body: payload,
        // Headers are not typically needed for FormData with fetch, browser sets Content-Type
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Upload failed (Status: ${response.status})`);
      }
      
      updateImagingField(index, 'documentName', result.filePath); // Store the returned filename/path
      setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: false, error: null, successMessage: `Uploaded: ${file.name}` } : s));

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown upload error.";
      console.error(`Error uploading file for imaging item ${index}:`, err);
      setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: false, error: message, successMessage: null } : s));
      // Optionally clear documentName if upload fails
      // updateImagingField(index, 'documentName', undefined); 
    }
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ imagingRecordsPermission: e.target.checked });
  };

  return (
    <div className="step-container">
      <h2 className="form-title">Imaging History</h2>
      
      <div>
        <p className="text-slate-700 dark:text-gray-300 mb-6">
          Please indicate which imaging studies you have had for your spine. For each study, provide the date and location if available.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600">Type of Study</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600">Had This?</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600">Radiology Clinic</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600">Spinal Region</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600 min-w-[250px]">Upload Document</th> 
              </tr>
            </thead>
            <tbody>
              {formData.imaging.map((image, index) => {
                const currentStatus = uploadStatuses[index] || { isLoading: false, error: null, successMessage: null };
                return (
                <tr key={index} className="border-b dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4 text-slate-800 dark:text-gray-200">{image.type}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
                          checked={image.hadStudy === true}
                          onChange={() => updateImagingField(index, 'hadStudy', true)}
                        />
                        <span className="ml-2 text-slate-700 dark:text-gray-300">Yes</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
                          checked={image.hadStudy === false}
                          onChange={() => {
                            updateImagingField(index, 'hadStudy', false);
                            // Also clear related fields if "No" is selected
                            updateImagingField(index, 'clinic', '');
                            updateImagingField(index, 'date', '');
                            updateImagingField(index, 'document', undefined);
                            updateImagingField(index, 'documentName', undefined);
                            setUploadStatuses(prev => prev.map((s, i) => i === index ? { isLoading: false, error: null, successMessage: null } : s));
                          }}
                        />
                        <span className="ml-2 text-slate-700 dark:text-gray-300">No</span>
                      </label>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {image.hadStudy && (
                      <input
                        type="text"
                        className="w-full px-3 py-1 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Clinic name"
                        value={image.clinic || ''}
                        onChange={(e) => updateImagingField(index, 'clinic', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {image.hadStudy && (
                      <input
                        type="date"
                        className="w-full px-3 py-1 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={image.date || ''}
                        onChange={(e) => updateImagingField(index, 'date', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {image.hadStudy && (
                      <select
                        multiple
                        className="w-full px-3 py-1 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={image.spinalRegions || []}
                        onChange={(e) => handleSpinalRegionChange(index, Array.from(e.target.selectedOptions, option => option.value))}
                      >
                        {spinalRegions.map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {image.hadStudy && (
                      <div>
                        <input
                          type="file"
                          className="w-full text-sm text-slate-500 dark:text-gray-400
                            file:mr-2 file:py-1 file:px-3 file:text-xs
                            file:rounded-full file:border-0
                            file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            dark:file:bg-blue-900/50 dark:file:text-blue-200
                            hover:file:bg-blue-100 dark:hover:file:bg-blue-800/50
                            disabled:opacity-50 disabled:cursor-not-allowed"
                          onChange={(e) => handleFileChange(index, e.target.files ? e.target.files[0] : undefined)}
                          disabled={currentStatus.isLoading}
                        />
                        {currentStatus.isLoading && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Uploading...</p>}
                        {currentStatus.error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">Error: {currentStatus.error}</p>}
                        {currentStatus.successMessage && !currentStatus.isLoading && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{currentStatus.successMessage}</p>}
                        {/* Display existing documentName if already uploaded and no current operation */}
                        {!currentStatus.isLoading && !currentStatus.error && !currentStatus.successMessage && image.documentName && (
                           <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Uploaded: {image.documentName.split('-').slice(2).join('-') /* Show originalish name */}</p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-200 mb-3">Request for Permission</h3>
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md shadow">
            <div className="flex items-start">
              <input 
                type="checkbox" 
                id="imagingPermission" 
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-400 rounded"
                checked={formData.imagingRecordsPermission}
                onChange={handlePermissionChange}
              />
              <label htmlFor="imagingPermission" className="ml-3 block text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-tight">
                I give permission for the clinical team to request my previous imaging records from radiology providers.
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagingHistoryStep;

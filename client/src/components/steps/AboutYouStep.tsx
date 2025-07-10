import React from 'react';
import { useFormContext } from '../../context/FormContext';

const AboutYouStep: React.FC = () => {
  const { formData, updateFormData } = useFormContext();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name.includes('residentialAddress') || name.includes('postalAddress')) {
      const addressType = name.split('.')[0] as 'residentialAddress' | 'postalAddress';
      const field = name.split('.')[1];
      
      updateFormData({
        demographics: {
          ...formData.demographics,
          [addressType]: {
            ...formData.demographics[addressType],
            [field]: value,
          },
        },
      });
    } else if (name.startsWith('funding.')) {
      const field = name.split('.')[1];
      updateFormData({
        demographics: {
          ...formData.demographics,
          funding: {
            ...formData.demographics.funding,
            [field]: value,
          },
        },
      });
    } else if (name.startsWith('nextOfKin.')) {
      const field = name.split('.')[1];
      updateFormData({
        demographics: {
          ...formData.demographics,
          nextOfKin: {
            ...formData.demographics.nextOfKin,
            [field]: value,
          },
        },
      });
    } else if (name.startsWith('referringDoctor.')) {
      const field = name.split('.')[1];
      const isCheckbox = type === 'checkbox';
      const { checked } = e.target as HTMLInputElement;
      
      updateFormData({
        demographics: {
          ...formData.demographics,
          referringDoctor: {
            ...formData.demographics.referringDoctor,
            [field]: isCheckbox ? checked : value,
          },
        },
      });
    } else if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      updateFormData({
        demographics: {
          ...formData.demographics,
          [name]: checked,
        },
      });
    } else {
      updateFormData({
        demographics: {
          ...formData.demographics,
          [name]: value,
        },
      });
    }
  };

  return (
    <div className="step-container">
      <h2 className="form-title">About You</h2>
      
      <div className="space-y-6">
        <p className="text-slate-700 dark:text-gray-300 mb-4">
          Please provide your personal information. Fields marked with an asterisk (*) are required.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.demographics.fullName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.demographics.dateOfBirth}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="gender" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Gender (Optional)
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.demographics.gender || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.demographics.phoneNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your phone number"
              required
            />
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.demographics.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email address"
              required
            />
          </div>
          
          <div className="col-span-2">
            <label htmlFor="addressLine1" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Residential Address *
            </label>
            <input
              type="text"
              id="addressLine1"
              name="residentialAddress.addressLine1"
              value={formData.demographics.residentialAddress.addressLine1}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Address Line 1"
              required
            />
          </div>
          <div className="col-span-2">
            <input
              type="text"
              id="addressLine2"
              name="residentialAddress.addressLine2"
              value={formData.demographics.residentialAddress.addressLine2 || ''}
              onChange={handleInputChange}
              className="w-full mt-2 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Address Line 2 (Optional)"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="suburb" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1 sr-only">
              Suburb
            </label>
            <input
              type="text"
              id="suburb"
              name="residentialAddress.suburb"
              value={formData.demographics.residentialAddress.suburb}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Suburb *"
              required
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="state" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1 sr-only">
              State
            </label>
            <input
              type="text"
              id="state"
              name="residentialAddress.state"
              value={formData.demographics.residentialAddress.state}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="State *"
              required
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="postcode" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1 sr-only">
              Postcode
            </label>
            <input
              type="text"
              id="postcode"
              name="residentialAddress.postcode"
              value={formData.demographics.residentialAddress.postcode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Postcode *"
              required
            />
          </div>

          <div className="col-span-2">
            <div className="flex items-center">
              <input
                id="isPostalSameAsResidential"
                name="isPostalSameAsResidential"
                type="checkbox"
                checked={formData.demographics.isPostalSameAsResidential}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPostalSameAsResidential" className="ml-2 block text-sm text-slate-700 dark:text-gray-300">
                Postal address is the same as residential
              </label>
            </div>
          </div>

          {!formData.demographics.isPostalSameAsResidential && (
            <>
              <div className="col-span-2">
                <label htmlFor="postalAddressLine1" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Postal Address *
                </label>
                <input
                  type="text"
                  id="postalAddressLine1"
                  name="postalAddress.addressLine1"
                  value={formData.demographics.postalAddress?.addressLine1 || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Address Line 1"
                  required
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  id="postalAddressLine2"
                  name="postalAddress.addressLine2"
                  value={formData.demographics.postalAddress?.addressLine2 || ''}
                  onChange={handleInputChange}
                  className="w-full mt-2 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Address Line 2 (Optional)"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="postalSuburb" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1 sr-only">
                  Suburb
                </label>
                <input
                  type="text"
                  id="postalSuburb"
                  name="postalAddress.suburb"
                  value={formData.demographics.postalAddress?.suburb || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Suburb *"
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="postalState" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1 sr-only">
                  State
                </label>
                <input
                  type="text"
                  id="postalState"
                  name="postalAddress.state"
                  value={formData.demographics.postalAddress?.state || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="State *"
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="postalPostcode" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1 sr-only">
                  Postcode
                </label>
                <input
                  type="text"
                  id="postalPostcode"
                  name="postalAddress.postcode"
                  value={formData.demographics.postalAddress?.postcode || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Postcode *"
                  required
                />
              </div>
            </>
          )}

          <div className="col-span-2 border-t border-slate-200 dark:border-gray-700 my-6"></div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              What is your insurance or funding source for treatment? *
            </label>
            <div className="space-y-2">
              {(['Private Health Insurance', 'Workers Compensation', 'DVA', 'TAC', 'Uninsured', 'Other'] as const).map((source) => (
                <div key={source} className="flex items-center">
                  <input
                    type="radio"
                    id={source}
                    name="funding.source"
                    value={source}
                    checked={formData.demographics.funding.source === source}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor={source} className="ml-3 block text-sm text-slate-700 dark:text-gray-300">
                    {source}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {formData.demographics.funding.source === 'Private Health Insurance' && (
            <>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="healthFundName" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Health Fund Name *
                </label>
                <input
                  type="text"
                  id="healthFundName"
                  name="funding.healthFundName"
                  value={formData.demographics.funding.healthFundName || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter health fund name"
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="membershipNumber" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Membership Number *
                </label>
                <input
                  type="text"
                  id="membershipNumber"
                  name="funding.membershipNumber"
                  value={formData.demographics.funding.membershipNumber || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter membership number"
                  required
                />
              </div>
            </>
          )}

          {['Workers Compensation', 'DVA', 'TAC'].includes(formData.demographics.funding.source) && (
            <div className="col-span-2">
              <label htmlFor="claimNumber" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Claim/Reference Number (Optional)
              </label>
              <input
                type="text"
                id="claimNumber"
                name="funding.claimNumber"
                value={formData.demographics.funding.claimNumber || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter claim/reference number"
              />
            </div>
          )}

          {formData.demographics.funding.source === 'Other' && (
            <div className="col-span-2">
              <label htmlFor="otherSource" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                Please specify other funding source *
              </label>
              <input
                type="text"
                id="otherSource"
                name="funding.otherSource"
                value={formData.demographics.funding.otherSource || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter other funding source"
                required
              />
            </div>
          )}

          <div className="col-span-2 border-t border-slate-200 dark:border-gray-700 my-6"></div>

          <div className="col-span-2"> {/* Medicare Number should be full width always */}
            <label htmlFor="medicareNumber" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Medicare Number (Optional)
            </label>
            <input
              type="text"
              id="medicareNumber"
              name="medicareNumber"
              value={formData.demographics.medicareNumber || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your Medicare number"
            />
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="medicareRefNum" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Medicare Individual Ref. No. (Optional)
            </label>
            <input
              type="text"
              id="medicareRefNum"
              name="medicareRefNum"
              value={formData.demographics.medicareRefNum || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1"
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label htmlFor="countryOfBirth" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Country of Birth (Optional)
            </label>
            <input
              type="text"
              id="countryOfBirth"
              name="countryOfBirth"
              value={formData.demographics.countryOfBirth || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your country of birth"
            />
          </div>

          <div className="col-span-2 border-t border-slate-200 dark:border-gray-700 my-6"></div>

          <div className="col-span-2">
            <h3 className="text-lg font-medium text-slate-800 dark:text-gray-200 mb-2">Emergency Contact</h3>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label htmlFor="nextOfKinFullName" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="nextOfKinFullName"
              name="nextOfKin.fullName"
              value={formData.demographics.nextOfKin.fullName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label htmlFor="nextOfKinRelationship" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Relationship to Patient *
            </label>
            <input
              type="text"
              id="nextOfKinRelationship"
              name="nextOfKin.relationship"
              value={formData.demographics.nextOfKin.relationship}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Spouse, Parent"
              required
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="nextOfKinPhoneNumber" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
              Contact Phone Number *
            </label>
            <input
              type="tel"
              id="nextOfKinPhoneNumber"
              name="nextOfKin.phoneNumber"
              value={formData.demographics.nextOfKin.phoneNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="col-span-2 border-t border-slate-200 dark:border-gray-700 my-6"></div>

          <div className="col-span-2">
            <h3 className="text-lg font-medium text-slate-800 dark:text-gray-200 mb-2">Referring Doctor</h3>
            <p className="text-sm text-slate-700 dark:text-gray-300 mb-2">Do you have a referring doctor?</p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  id="hasReferringDoctorYes"
                  name="referringDoctor.hasReferringDoctor"
                  type="radio"
                  value="true"
                  checked={formData.demographics.referringDoctor.hasReferringDoctor === true}
                  onChange={() => updateFormData({ demographics: { ...formData.demographics, referringDoctor: { ...formData.demographics.referringDoctor, hasReferringDoctor: true } } })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="hasReferringDoctorYes" className="ml-2 block text-sm text-slate-700 dark:text-gray-300">
                  Yes
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="hasReferringDoctorNo"
                  name="referringDoctor.hasReferringDoctor"
                  type="radio"
                  value="false"
                  checked={formData.demographics.referringDoctor.hasReferringDoctor === false}
                  onChange={() => updateFormData({ demographics: { ...formData.demographics, referringDoctor: { ...formData.demographics.referringDoctor, hasReferringDoctor: false } } })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="hasReferringDoctorNo" className="ml-2 block text-sm text-slate-700 dark:text-gray-300">
                  No
                </label>
              </div>
            </div>
          </div>

          {formData.demographics.referringDoctor.hasReferringDoctor === true && (
            <>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="doctorName" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Doctor's Name *
                </label>
                <input
                  type="text"
                  id="doctorName"
                  name="referringDoctor.doctorName"
                  value={formData.demographics.referringDoctor.doctorName || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter doctor's name"
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="clinic" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Clinic/Practice *
                </label>
                <input
                  type="text"
                  id="clinic"
                  name="referringDoctor.clinic"
                  value={formData.demographics.referringDoctor.clinic || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter clinic/practice name"
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="referringDoctorPhoneNumber" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="referringDoctorPhoneNumber"
                  name="referringDoctor.phoneNumber"
                  value={formData.demographics.referringDoctor.phoneNumber || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="referringDoctorEmail" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="referringDoctorEmail"
                  name="referringDoctor.email"
                  value={formData.demographics.referringDoctor.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="fax" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Fax (yes, really)
                </label>
                <input
                  type="text"
                  id="fax"
                  name="referringDoctor.fax"
                  value={formData.demographics.referringDoctor.fax || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter fax number"
                />
              </div>
            </>
          )}
          
          {formData.demographics.referringDoctor.hasReferringDoctor === false && (
            <div className="col-span-2 mt-2 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                No worries — if you don’t have a referral yet, our team can help guide you through the process. You may still complete this evaluation and we’ll follow up with next steps.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Your information is protected by our privacy policy and will only be used for the purpose of this evaluation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutYouStep;

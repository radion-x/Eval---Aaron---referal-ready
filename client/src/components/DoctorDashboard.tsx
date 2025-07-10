import React, { useState, useEffect } from 'react';

// Define interfaces for our data structures
interface User {
  id: string; // This will be the patient's email
  name: string;
}

interface Address {
  addressLine1: string;
  addressLine2?: string;
  suburb: string;
  state: string;
  postcode: string;
}

interface ServerAssessment {
  _id: string; 
  consent?: boolean;
  diagnoses?: {
    herniatedDisc?: boolean;
    spinalStenosis?: boolean;
    spondylolisthesis?: boolean;
    scoliosis?: boolean;
    spinalFracture?: boolean;
    degenerativeDiscDisease?: boolean;
    other?: string;
  };
  treatments?: {
    overTheCounterMedication?: boolean;
    prescriptionAntiInflammatory?: boolean;
    prescriptionAntiInflammatoryName?: string;
    prescriptionPainMedication?: boolean;
    prescriptionPainMedicationName?: string;
    spinalInjections?: boolean;
    spinalInjectionsDetails?: string;
    physiotherapy?: boolean;
    chiropracticTreatment?: boolean;
    osteopathyMyotherapy?: boolean;
  };
  hadSurgery?: boolean;
  surgeries?: Array<{
    date?: string;
    procedure?: string;
    surgeon?: string;
    hospital?: string;
  }>;
  imaging?: Array<{
    type?: string;
    hadStudy?: boolean;
    clinic?: string;
    date?: string;
    documentName?: string; 
  }>;
  painAreas?: Array<{
    id?: string; 
    region?: string;
    intensity?: number;
    notes?: string;
    coordinates?: { x?: number; y?: number };
  }>;
  painDescription?: string;
  demographics: {
    fullName: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    email: string;
    residentialAddress: Address;
    isPostalSameAsResidential: boolean;
    postalAddress?: Address;
    funding: {
      source: string;
      healthFundName?: string;
      membershipNumber?: string;
      claimNumber?: string;
      otherSource?: string;
    };
    nextOfKin: {
      fullName: string;
      relationship: string;
      phoneNumber: string;
    };
    referringDoctor: {
      hasReferringDoctor: boolean;
      doctorName?: string;
      clinic?: string;
      phoneNumber?: string;
      email?: string;
      fax?: string;
    };
    gender?: string;
    medicareNumber?: string;
    countryOfBirth?: string;
  };
  aiSummary?: string;
  treatmentGoals?: string;
  painMapImageFront?: string;
  painMapImageBack?: string;
  nextStep?: string;
  recommendationText?: string;
  systemRecommendation?: string;
  createdAt: string; 
  updatedAt: string; 
}

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow">
    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h4>
    {children}
  </div>
);

const DoctorDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true); // For initial auth check

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userAssessments, setUserAssessments] = useState<ServerAssessment[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false); // Initially false, true when fetching
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initial authentication check
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsAuthLoading(true);
      try {
        const response = await fetch('/api/doctor/check-auth');
        if (!response.ok) {
          // Consider non-200 as not authenticated or error
          setIsAuthenticated(false);
          console.error('Auth check failed:', response.status);
        } else {
          const data = await response.json();
          setIsAuthenticated(data.isAuthenticated);
        }
      } catch (error) {
        console.error("Failed to check auth status:", error);
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  // Fetch users only if authenticated
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAuthenticated) {
        setUsers([]); // Clear users if not authenticated
        setIsLoadingUsers(false);
        return;
      }
      setIsLoadingUsers(true);
      try {
        const response = await fetch('/api/doctor/patients');
        if (!response.ok) {
          if (response.status === 401) setIsAuthenticated(false); // Session expired or invalid
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: User[] = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    if (!isAuthLoading) { // Only run after initial auth check is complete
        fetchUsers();
    }
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (selectedUser && selectedUser.id) { 
      const fetchAssessments = async () => {
        setIsLoadingAssessments(true);
        setUserAssessments([]); 
        try {
          const response = await fetch(`/api/doctor/patient/${selectedUser.id}/assessments`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data: ServerAssessment[] = await response.json();
          setUserAssessments(data);
        } catch (error) {
          console.error("Failed to fetch assessments for user:", selectedUser.id, error);
          setUserAssessments([]); 
        } finally {
          setIsLoadingAssessments(false);
        }
      };
      fetchAssessments();
    } else {
      setUserAssessments([]);
    }
  }, [selectedUser]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    // Automatically close the sidebar on mobile after selection
    if (window.innerWidth < 768) { // md breakpoint
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (window.confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/doctor/assessment/${assessmentId}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete assessment.');
        }
        setUserAssessments(prev => prev.filter(a => a._id !== assessmentId));
      } catch (error) {
        console.error("Failed to delete assessment:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        alert(`Error: ${message}`);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this entire user and all their assessments? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/doctor/user/${userId}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete user.');
        }
        setUsers(prev => prev.filter(u => u.id !== userId));
        setSelectedUser(null);
        setUserAssessments([]);
      } catch (error) {
        console.error("Failed to delete user:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        alert(`Error: ${message}`);
      }
    }
  };

  const renderTextSection = (title: string, content?: string | null, isPreformatted = false) => {
    if (!content && content !== "") return null;
    return (
      <SectionCard title={title}>
        {isPreformatted ? (
          <pre className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">{content}</pre>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{content}</p>
        )}
      </SectionCard>
    );
  };
  
  const renderDemographics = (demographics: ServerAssessment['demographics']) => {
    const residentialAddress = demographics.residentialAddress ? `${demographics.residentialAddress.addressLine1}, ${demographics.residentialAddress.addressLine2 ? demographics.residentialAddress.addressLine2 + ', ' : ''}${demographics.residentialAddress.suburb}, ${demographics.residentialAddress.state} ${demographics.residentialAddress.postcode}` : 'N/A';
    const postalAddress = !demographics.isPostalSameAsResidential && demographics.postalAddress ? `${demographics.postalAddress.addressLine1}, ${demographics.postalAddress.addressLine2 ? demographics.postalAddress.addressLine2 + ', ' : ''}${demographics.postalAddress.suburb}, ${demographics.postalAddress.state} ${demographics.postalAddress.postcode}` : 'Same as residential';

    return (
      <SectionCard title="Demographics">
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li><strong>Full Name:</strong> {demographics.fullName || 'N/A'}</li>
          <li><strong>Email:</strong> {demographics.email || 'N/A'}</li>
          {demographics.dateOfBirth && <li><strong>DOB:</strong> {demographics.dateOfBirth}</li>}
          {demographics.phoneNumber && <li><strong>Phone:</strong> {demographics.phoneNumber}</li>}
          <li><strong>Residential Address:</strong> {residentialAddress}</li>
          {!demographics.isPostalSameAsResidential && <li><strong>Postal Address:</strong> {postalAddress}</li>}
          {demographics.funding && demographics.funding.source && (
            <>
              <li className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600"><strong>Funding Source:</strong> {demographics.funding.source}</li>
              {demographics.funding.source === 'Private Health Insurance' && (
                <>
                  <li><strong>Health Fund:</strong> {demographics.funding.healthFundName || 'N/A'}</li>
                  <li><strong>Membership No.:</strong> {demographics.funding.membershipNumber || 'N/A'}</li>
                </>
              )}
              {['Workers Compensation', 'DVA', 'TAC'].includes(demographics.funding.source) && demographics.funding.claimNumber && (
                <li><strong>Claim/Ref No.:</strong> {demographics.funding.claimNumber}</li>
              )}
              {demographics.funding.source === 'Other' && demographics.funding.otherSource && (
                <li><strong>Other Source:</strong> {demographics.funding.otherSource}</li>
              )}
            </>
          )}
          {demographics.nextOfKin && (
            <>
              <li className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600"><strong>Emergency Contact:</strong> {demographics.nextOfKin.fullName} ({demographics.nextOfKin.relationship})</li>
              <li><strong>Emergency Contact Phone:</strong> {demographics.nextOfKin.phoneNumber}</li>
            </>
          )}
          {demographics.referringDoctor && (
            <>
              <li className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600"><strong>Referring Doctor:</strong> {demographics.referringDoctor.hasReferringDoctor ? 'Yes' : 'No'}</li>
              {demographics.referringDoctor.hasReferringDoctor && (
                <>
                  <li><strong>Doctor's Name:</strong> {demographics.referringDoctor.doctorName}</li>
                  <li><strong>Clinic:</strong> {demographics.referringDoctor.clinic}</li>
                  <li><strong>Phone:</strong> {demographics.referringDoctor.phoneNumber}</li>
                  <li><strong>Email:</strong> {demographics.referringDoctor.email}</li>
                  <li><strong>Fax:</strong> {demographics.referringDoctor.fax}</li>
                </>
              )}
            </>
          )}
          {demographics.gender && <li><strong>Gender:</strong> {demographics.gender}</li>}
          {demographics.medicareNumber && <li><strong>Medicare No.:</strong> {demographics.medicareNumber}</li>}
          {demographics.countryOfBirth && <li><strong>Country of Birth:</strong> {demographics.countryOfBirth}</li>}
        </ul>
      </SectionCard>
    );
  };

  const renderDiagnoses = (diagnoses?: ServerAssessment['diagnoses']) => {
    if (!diagnoses) return null;
    const list = Object.entries(diagnoses)
      .filter(([, value]) => value)
      .map(([key, value]) => {
        if (key === 'other' && typeof value === 'string') return `Other: ${value}`;
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      });
    if (list.length === 0) return <SectionCard title="Diagnoses"><p className="text-sm text-gray-500 dark:text-gray-400">No diagnoses reported.</p></SectionCard>;
    return <SectionCard title="Diagnoses"><ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">{list.map(item => <li key={item}>{item}</li>)}</ul></SectionCard>;
  };

  const renderTreatments = (treatments?: ServerAssessment['treatments']) => {
    if (!treatments) return null;
    const list = [];
    if (treatments.overTheCounterMedication) list.push("Over-the-counter Medication");
    if (treatments.prescriptionAntiInflammatory) list.push(`Prescription Anti-inflammatory: ${treatments.prescriptionAntiInflammatoryName || 'N/A'}`);
    if (treatments.prescriptionPainMedication) list.push(`Prescription Pain Medication: ${treatments.prescriptionPainMedicationName || 'N/A'}`);
    if (treatments.spinalInjections) list.push(`Spinal Injections: ${treatments.spinalInjectionsDetails || 'N/A'}`);
    if (treatments.physiotherapy) list.push("Physiotherapy");
    if (treatments.chiropracticTreatment) list.push("Chiropractic Treatment");
    if (treatments.osteopathyMyotherapy) list.push("Osteopathy/Myotherapy");
    if (list.length === 0) return <SectionCard title="Treatments"><p className="text-sm text-gray-500 dark:text-gray-400">No treatments reported.</p></SectionCard>;
    return <SectionCard title="Treatments"><ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">{list.map(item => <li key={item}>{item}</li>)}</ul></SectionCard>;
  };

  const renderSurgeries = (surgeries?: ServerAssessment['surgeries'], hadSurgery?: boolean) => {
    if (hadSurgery === false) return <SectionCard title="Surgeries"><p className="text-sm text-gray-500 dark:text-gray-400">No surgical history reported.</p></SectionCard>;
    if (!surgeries || surgeries.length === 0) return null; 
    return (
      <SectionCard title="Surgeries">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr><th className="p-2">Date</th><th className="p-2">Procedure</th><th className="p-2">Surgeon</th><th className="p-2">Hospital</th></tr>
            </thead>
            <tbody>
              {surgeries.map((s, i) => <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50">
                <td className="p-2">{s.date || 'N/A'}</td><td className="p-2">{s.procedure || 'N/A'}</td><td className="p-2">{s.surgeon || 'N/A'}</td><td className="p-2">{s.hospital || 'N/A'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </SectionCard>
    );
  };
  
  const renderImagingList = (imaging?: ServerAssessment['imaging']) => {
    const studies = imaging?.filter(img => img.hadStudy);
    if (!studies || studies.length === 0) return <SectionCard title="Imaging History"><p className="text-sm text-gray-500 dark:text-gray-400">No imaging studies reported.</p></SectionCard>;
    
    // Access the environment variable for the backend URL
    const backendUrl = import.meta.env.VITE_SERVER_BASE_URL || '';

    return (
      <SectionCard title="Imaging History">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr><th className="p-2">Type</th><th className="p-2">Date</th><th className="p-2">Clinic</th><th className="p-2">Document</th></tr>
            </thead>
            <tbody>
              {studies.map((img, i) => {
                // Construct the full URL for the document
                const documentUrl = img.documentName ? `${backendUrl}/uploads/assessment_files/${img.documentName}` : '#';
                return (
                  <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50">
                    <td className="p-2">{img.type || 'N/A'}</td>
                    <td className="p-2">{img.date || 'N/A'}</td>
                    <td className="p-2">{img.clinic || 'N/A'}</td>
                    <td className="p-2">
                      {img.documentName ? (
                        <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          View
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    );
  };

  const renderPainAreas = (painAreas?: ServerAssessment['painAreas']) => {
    if (!painAreas || painAreas.length === 0) return null;
    return (
      <SectionCard title="Pain Areas">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr><th className="p-2">Region</th><th className="p-2">Intensity</th><th className="p-2">Notes</th></tr>
            </thead>
            <tbody>
              {painAreas.map((area) => <tr key={area.id || Math.random()} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50">
                <td className="p-2">{area.region || 'N/A'}</td><td className="p-2">{area.intensity !== undefined ? `${area.intensity}/10` : 'N/A'}</td><td className="p-2">{area.notes || 'N/A'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </SectionCard>
    );
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/doctor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        setLoginError(errorData.error || 'Login failed. Please check password.');
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
        setPassword(''); // Clear password field on successful login
      }
    } catch (error) {
      console.error("Login request failed:", error);
      setLoginError('Login request failed. Please try again.');
      setIsAuthenticated(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/doctor/logout', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Logout failed:', errorData.error || 'Server error');
        // Optionally show an error to the user
      }
    } catch (error) {
      console.error("Logout request failed:", error);
      // Optionally show an error to the user
    } finally {
      setIsAuthenticated(false);
      setSelectedUser(null);
      setUserAssessments([]);
      setUsers([]);
      setLoginError(''); // Clear any previous login errors
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-gray-500 dark:text-gray-400">Loading Dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 relative z-50"> {/* Added relative and z-50 */}
        <form 
          onSubmit={handleLogin} 
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside form from bubbling
          className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">Doctor Dashboard Login</h2>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
              required
              autoFocus
            />
          </div>
          {loginError && <p className="text-sm text-red-500 dark:text-red-400 mb-4 text-center">{loginError}</p>}
          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 absolute inset-0 pt-16">
      {/* Mobile header with toggle */}
      <div className="md:hidden flex justify-between items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
        <h2 className="text-xl font-semibold">{selectedUser ? selectedUser.name : 'Patients'}</h2>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`w-full md:w-1/4 bg-white dark:bg-gray-800 p-6 shadow-lg z-30 flex-shrink-0 md:h-full md:overflow-y-auto transform md:transform-none transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} absolute md:relative`}>
        <div className="flex justify-between items-center mb-6 border-b pb-2 border-gray-300 dark:border-gray-700">
          <h2 className="text-2xl font-semibold">Patients</h2>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Logout
          </button>
        </div>
        {isLoadingUsers ? (<p className="text-gray-500 dark:text-gray-400">Loading patients...</p>)
          : users.length === 0 ? (<p className="text-gray-500 dark:text-gray-400">No patients found or access issue.</p>)
          : (<ul className="space-y-2"> {users.map(user => (<li key={user.id}><button onClick={() => handleUserSelect(user)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-150 ease-in-out ${selectedUser?.id === user.id ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-gray-200 dark:hover:bg-gray-700 focus:bg-gray-200 dark:focus:bg-gray-700'} focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600`}>{user.name} ({user.id})</button></li>))} </ul>
        )}
      </div>

      {/* Evaluation Details Area: flex-1 to take remaining space, overflow-y-auto for its own scroll */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedUser ? (
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-300 dark:border-gray-600">
            <h2 className="text-2xl md:text-3xl font-bold">Evaluations for {selectedUser.name}</h2>
            <button
              onClick={() => handleDeleteUser(selectedUser.id)}
              className="ml-4 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Delete User
            </button>
          </div>
            {isLoadingAssessments ? (<p className="text-gray-500 dark:text-gray-400 text-center py-10">Loading evaluations...</p>)
            : userAssessments.length > 0 ? (
              <div className="space-y-8"> {/* Increased space between evaluation cards */}
                {userAssessments.map((assessment) => (
                  <div key={assessment._id} className="bg-gray-100 dark:bg-gray-700/30 p-4 md:p-6 rounded-xl shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                        <h3 className="text-lg md:text-xl font-semibold text-blue-600 dark:text-blue-400 mb-1 sm:mb-0">Evaluation ID: {assessment._id}</h3>
                        <div className="flex items-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-right">
                              <p>Taken: {new Date(assessment.createdAt).toLocaleString()}</p>
                              <p>Updated: {new Date(assessment.updatedAt).toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteAssessment(assessment._id)}
                            className="ml-4 px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                          >
                            Delete
                          </button>
                        </div>
                    </div>
                    
                    {renderDemographics(assessment.demographics)}
                    {renderTextSection("Pain Description", assessment.painDescription)}
                    {renderTextSection("Treatment Goals", assessment.treatmentGoals)}
                    {renderDiagnoses(assessment.diagnoses)}
                    {renderTreatments(assessment.treatments)}
                    {renderSurgeries(assessment.surgeries, assessment.hadSurgery)}
                    {renderImagingList(assessment.imaging)}
                    {renderPainAreas(assessment.painAreas)}
                    {(assessment.painMapImageFront || assessment.painMapImageBack) && (
                      <SectionCard title="Pain Map Images">
                        <div className="flex justify-around">
                          {assessment.painMapImageFront && (
                            <div className="text-center">
                              <h4 className="font-semibold mb-2">Front View</h4>
                              <img src={`${import.meta.env.VITE_SERVER_BASE_URL}/uploads/assessment_files/${assessment.painMapImageFront}`} alt="Pain Map Front" className="max-w-xs rounded-lg shadow-md" />
                            </div>
                          )}
                          {assessment.painMapImageBack && (
                            <div className="text-center">
                              <h4 className="font-semibold mb-2">Back View</h4>
                              <img src={`${import.meta.env.VITE_SERVER_BASE_URL}/uploads/assessment_files/${assessment.painMapImageBack}`} alt="Pain Map Back" className="max-w-xs rounded-lg shadow-md" />
                            </div>
                          )}
                        </div>
                      </SectionCard>
                    )}
                    {renderTextSection("Next Step Chosen by User", assessment.nextStep)}
                    {renderTextSection("Adaptive Next-Step Evaluation", assessment.systemRecommendation)}
                    {renderTextSection("Initial Triage: Report and Summary", assessment.aiSummary, true)}
                    {/* Removed raw JSON dump */}
                  </div>
                ))}
              </div>
            ) : (<p className="text-gray-500 dark:text-gray-400 text-center py-10">No evaluations found for this patient.</p>)}
          </div>
        ) : (<div className="flex items-center justify-center h-full"><p className="text-xl text-gray-500 dark:text-gray-400">Select a patient to view their evaluations.</p></div>)}
      </div>
    </div>
  );
};

export default DoctorDashboard;

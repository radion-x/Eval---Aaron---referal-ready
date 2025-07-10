import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FormProvider } from './context/FormContext';
import FormStepper from './components/FormStepper';
import DoctorRoutes from './routing/DoctorRoutes';
import PlasmaBackground from './components/PlasmaBackground';
import ThemeToggleButton from './components/ThemeToggleButton';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isDoctorDashboard = location.pathname.startsWith('/doctors');

  return (
    <div className="min-h-screen relative isolate">
      <PlasmaBackground isDashboard={isDoctorDashboard} />
      <ThemeToggleButton />
      <nav className="absolute top-4 right-20 z-20"> {/* Adjusted right padding for ThemeToggleButton */}
        <Link to="/" className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400">Patient Form</Link>
        <Link to="/doctors" className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400">Doctor Dashboard</Link>
      </nav>
      <Routes>
        <Route path="/" element={<PatientFormPage />} />
        <Route path="/doctors/*" element={<DoctorRoutes />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Create a wrapper component for the patient form page content
const PatientFormPage: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 py-12 relative z-10 text-gray-900 dark:text-gray-100">
    <FormProvider>
      <FormStepper />
    </FormProvider>
  </div>
);

export default App;

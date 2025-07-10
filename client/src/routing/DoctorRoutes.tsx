import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const DoctorDashboard = lazy(() => import('../components/DoctorDashboard'));

const DoctorRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<DoctorDashboard />} />
      </Routes>
    </Suspense>
  );
};

export default DoctorRoutes;

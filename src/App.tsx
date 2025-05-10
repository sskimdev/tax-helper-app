// src/App.tsx
import React, { Suspense } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingFallback } from '@/components/custom/LoadingFallback';
import { useAuth } from './contexts/AuthContext';
import { useProAuth } from './hooks/useProAuth';
import { Toaster } from "@/components/ui/toaster";

// 모든 페이지 컴포넌트는 default export를 사용한다고 가정합니다.
const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const RequestFilingPage = React.lazy(() => import('./pages/RequestFilingPage'));
const MyFilingsPage = React.lazy(() => import('./pages/MyFilingsPage'));
const FilingRequestDetailPage = React.lazy(() => import('./pages/FilingRequestDetailPage'));
const EditFilingRequestPage = React.lazy(() => import('./pages/EditFilingRequestPage'));
const ExpertsPage = React.lazy(() => import('./pages/ExpertsPage'));
const ExpertDetailPage = React.lazy(() => import('./pages/ExpertDetailPage'));
const ProDashboardPage = React.lazy(() => import('./pages/ProDashboardPage'));
const AssignedRequestsPage = React.lazy(() => import('./pages/AssignedRequestsPage'));
const ProRequestDetailPage = React.lazy(() => import('./pages/ProRequestDetailPage'));

const NotFoundPage = () => <div className="flex items-center justify-center min-h-screen text-2xl">404 - 페이지를 찾을 수 없습니다.</div>;

const UserRoutes = () => (
    <MainLayout>
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/request-filing" element={<RequestFilingPage />} />
            <Route path="/my-filings" element={<MyFilingsPage />} />
            <Route path="/my-filings/:id" element={<FilingRequestDetailPage />} />
            <Route path="/my-filings/:id/edit" element={<EditFilingRequestPage />} />
            <Route path="/experts" element={<ExpertsPage />} />
            <Route path="/experts/:id" element={<ExpertDetailPage />} />
            <Route path="/pro/*" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    </MainLayout>
);

const ProRoutesGroup = () => (
     <Routes>
        <Route path="/pro/dashboard" element={<ProDashboardPage />} />
        <Route path="/pro/requests" element={<AssignedRequestsPage />} />
        <Route path="/pro/requests/:id" element={<ProRequestDetailPage />} />
         <Route path="/" element={<Navigate to="/pro/dashboard" replace />} />
         <Route path="/request-filing" element={<Navigate to="/pro/dashboard" replace />} />
         <Route path="/my-filings/*" element={<Navigate to="/pro/dashboard" replace />} />
         <Route path="/experts/*" element={<Navigate to="/pro/dashboard" replace />} />
         <Route path="*" element={<NotFoundPage />} />
     </Routes>
);

function App() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const { isProfessional, isLoadingPro } = useProAuth();

  if (isAuthLoading || isLoadingPro) {
    return <LoadingFallback message="사용자 정보 확인 중..." />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <>
         <Routes>
             <Route path="/login" element={!session ? <LoginPage /> : (isProfessional ? <Navigate to="/pro/dashboard" replace/> : <Navigate to="/" replace/>) } />
             <Route path="/signup" element={!session ? <SignupPage /> : (isProfessional ? <Navigate to="/pro/dashboard" replace/> : <Navigate to="/" replace/>) } />
             {session ? (
                isProfessional ? (<Route path="/*" element={<ProRoutesGroup />} />)
                               : (<Route path="/*" element={<UserRoutes />} />)
             ) : (
                <>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/experts" element={<ExpertsPage />} />
                    <Route path="/experts/:id" element={<ExpertDetailPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
             )}
         </Routes>
        <Toaster />
    </>
    </Suspense>
  );
}
export default App;
// src/App.tsx
import { MainLayout } from '@/components/layout/MainLayout';
// ProLayout import는 각 Pro 페이지에서 직접 사용하도록 변경되었으므로 여기선 불필요
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useProAuth } from './hooks/useProAuth';
import { Toaster } from "@/components/ui/toaster";

// 지연 로딩 적용 - named export를 위한 방식 사용
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(module => ({ default: module.SignupPage })));
const RequestFilingPage = lazy(() => import('./pages/RequestFilingPage').then(module => ({ default: module.RequestFilingPage })));
const MyFilingsPage = lazy(() => import('./pages/MyFilingsPage').then(module => ({ default: module.MyFilingsPage })));
const FilingRequestDetailPage = lazy(() => import('./pages/FilingRequestDetailPage').then(module => ({ default: module.FilingRequestDetailPage })));
const EditFilingRequestPage = lazy(() => import('./pages/EditFilingRequestPage').then(module => ({ default: module.EditFilingRequestPage })));
const ExpertsPage = lazy(() => import('./pages/ExpertsPage').then(module => ({ default: module.ExpertsPage })));
const ExpertDetailPage = lazy(() => import('./pages/ExpertDetailPage').then(module => ({ default: module.ExpertDetailPage })));
const ProDashboardPage = lazy(() => import('./pages/ProDashboardPage').then(module => ({ default: module.ProDashboardPage })));
const AssignedRequestsPage = lazy(() => import('./pages/AssignedRequestsPage').then(module => ({ default: module.AssignedRequestsPage })));
const ProRequestDetailPage = lazy(() => import('./pages/ProRequestDetailPage'));

const NotFoundPage = () => <div><h1>404 - 페이지를 찾을 수 없습니다.</h1></div>;

// 로딩 컴포넌트
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
    <div className="animate-pulse text-center">
      <p className="text-lg">페이지 로딩 중...</p>
    </div>
  </div>
);

// 일반 사용자 라우트 컴포넌트
const UserRoutes = () => (
    <MainLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/request-filing" element={<RequestFilingPage />} />
            <Route path="/my-filings" element={<MyFilingsPage />} />
            <Route path="/my-filings/:id" element={<FilingRequestDetailPage />} />
            <Route path="/my-filings/:id/edit" element={<EditFilingRequestPage />} />
            <Route path="/experts" element={<ExpertsPage />} />
            <Route path="/experts/:id" element={<ExpertDetailPage />} />
            <Route path="/pro/*" element={<Navigate to="/" replace />} /> {/* 전문가 경로 접근 시 홈으로 */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </MainLayout>
);

// 전문가 사용자 라우트 그룹 정의
const ProRoutesGroup = () => (
  <Suspense fallback={<LoadingFallback />}>
     <Routes>
        <Route path="/pro/dashboard" element={<ProDashboardPage />} />
        <Route path="/pro/requests" element={<AssignedRequestsPage />} />
        <Route path="/pro/requests/:id" element={<ProRequestDetailPage />} /> {/* 전문가 의뢰 상세 */}
        <Route path="/" element={<Navigate to="/pro/dashboard" replace />} /> {/* 일반 경로 접근 시 전문가 대시보드로 */}
        <Route path="/request-filing" element={<Navigate to="/pro/dashboard" replace />} />
        <Route path="/my-filings/*" element={<Navigate to="/pro/dashboard" replace />} />
        <Route path="/experts/*" element={<Navigate to="/pro/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} /> {/* 전문가용 NotFound */}
     </Routes>
  </Suspense>
);

function App() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const { isProfessional, isLoadingPro } = useProAuth();

  if (isAuthLoading || isLoadingPro) {
    return <div className="flex items-center justify-center min-h-screen">정보 확인 중...</div>;
  }

  return (
      <>
         <Suspense fallback={<LoadingFallback />}>
           <Routes>
               <Route path="/login" element={!session ? <LoginPage /> : (isProfessional ? <Navigate to="/pro/dashboard" replace/> : <Navigate to="/" replace/>) } />
               <Route path="/signup" element={!session ? <SignupPage /> : (isProfessional ? <Navigate to="/pro/dashboard" replace/> : <Navigate to="/" replace/>) } />
               {/* 역할에 따른 라우트 그룹 렌더링 */}
               {session && isProfessional && <Route path="/*" element={<ProRoutesGroup />} /> }
               {session && !isProfessional && <Route path="/*" element={<UserRoutes />} /> }
               {!session && (
                  // 비로그인 시 접근 가능한 페이지들 (UserRoutes의 일부 + ExpertsRoutes)
                  <>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/experts" element={<ExpertsPage />} />
                      <Route path="/experts/:id" element={<ExpertDetailPage />} />
                      {/* 그 외 모든 경로는 로그인으로 리디렉션 */}
                      <Route path="*" element={<Navigate to="/login" replace />} />
                  </>
               )}
           </Routes>
         </Suspense>
        <Toaster />
    </>
  );
}
export default App;
// src/App.tsx
import { MainLayout } from '@/components/layout/MainLayout';
// ProLayout import는 각 Pro 페이지에서 직접 사용하도록 변경되었으므로 여기선 불필요
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { RequestFilingPage } from './pages/RequestFilingPage';
import { MyFilingsPage } from './pages/MyFilingsPage';
import { FilingRequestDetailPage } from './pages/FilingRequestDetailPage';
import { EditFilingRequestPage } from './pages/EditFilingRequestPage';
import { ExpertsPage } from './pages/ExpertsPage';
import { ExpertDetailPage } from './pages/ExpertDetailPage';
import { ProDashboardPage } from './pages/ProDashboardPage';
import { AssignedRequestsPage } from './pages/AssignedRequestsPage';
import { ProRequestDetailPage } from './pages/ProRequestDetailPage'; // 전문가 의뢰 상세 페이지 import
import { useAuth } from './contexts/AuthContext';
import { useProAuth } from './hooks/useProAuth';
import { Toaster } from "@/components/ui/toaster";

const NotFoundPage = () => <div><h1>404 - 페이지를 찾을 수 없습니다.</h1></div>;

// 일반 사용자 라우트 컴포넌트
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
            <Route path="/pro/*" element={<Navigate to="/" replace />} /> {/* 전문가 경로 접근 시 홈으로 */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
        {/* Toaster는 App 컴포넌트 최상단으로 이동 */}
    </MainLayout>
);

// 전문가 사용자 라우트 그룹 정의
const ProRoutesGroup = () => (
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
);

function App() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const { isProfessional, isLoadingPro } = useProAuth();

  if (isAuthLoading || isLoadingPro) {
    return <div className="flex items-center justify-center min-h-screen">정보 확인 중...</div>;
  }

  return (
      <>
         {/* 로그인/회원가입 페이지는 모든 사용자가 접근 가능 */}
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
        <Toaster />
    </>
  );
}
export default App;
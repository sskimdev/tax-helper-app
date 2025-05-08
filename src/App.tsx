// src/App.tsx
import { MainLayout } from '@/components/layout/MainLayout';
// import { ProLayout } from '@/components/layout/ProLayout'; // 전문가 레이아웃 import
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
import { ProDashboardPage } from './pages/ProDashboardPage'; // 전문가 페이지 import
import { AssignedRequestsPage } from './pages/AssignedRequestsPage'; // 전문가 페이지 import
import { useAuth } from './contexts/AuthContext';
import { useProAuth } from './hooks/useProAuth'; // 전문가 인증 훅 import
import { Toaster } from "@/components/ui/toaster";

const NotFoundPage = () => <div><h1>404 - 페이지를 찾을 수 없습니다.</h1></div>;

// 일반 사용자 라우트 컴포넌트
const UserRoutes = () => (
    <MainLayout>
        <Routes>
            <Route path="/" element={<HomePage />} />
            {/* 로그인/회원가입은 공통 접근 가능 */}
            {/* <Route path="/login" element={<LoginPage />} /> */}
            {/* <Route path="/signup" element={<SignupPage />} /> */}
            <Route path="/request-filing" element={<RequestFilingPage />} />
            <Route path="/my-filings" element={<MyFilingsPage />} />
            <Route path="/my-filings/:id" element={<FilingRequestDetailPage />} />
            <Route path="/my-filings/:id/edit" element={<EditFilingRequestPage />} />
            <Route path="/experts" element={<ExpertsPage />} />
            <Route path="/experts/:id" element={<ExpertDetailPage />} />
            {/* 전문가 경로 접근 시 홈으로 리디렉션 (선택 사항) */}
            <Route path="/pro/*" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
    </MainLayout>
);

// ProRoutes 컴포넌트 제거

function App() {
  // useAuth는 ProAuthProvider 내부에서도 사용 가능
  const { isLoading: isAuthLoading, session } = useAuth();
  const { isProfessional, isLoadingPro } = useProAuth();

  // 인증 정보 또는 전문가 정보 로딩 중일 때
  if (isAuthLoading || isLoadingPro) {
    return <div className="flex items-center justify-center min-h-screen">정보 확인 중...</div>;
  }

  return (
      <>
        {/* 로그인 페이지와 회원가입 페이지는 레이아웃 외부에 배치 */}
        <Routes>
             <Route path="/login" element={<LoginPage />} />
             <Route path="/signup" element={<SignupPage />} />
        </Routes>

        {/* 로그인 상태 및 역할에 따라 다른 라우트 그룹 렌더링 */}
        {session && isProfessional ? (
             // 전문가 라우트 (ProLayout은 각 페이지 내에서 처리)
             <Routes>
                <Route path="/pro/dashboard" element={<ProDashboardPage />} />
                <Route path="/pro/requests" element={<AssignedRequestsPage />} />
                 {/* 전문가용 NotFound */}
                 <Route path="*" element={<Navigate to="/pro/dashboard" replace />} />
             </Routes>
        ) : session && !isProfessional ? (
            // 일반 사용자 라우트 (MainLayout 사용)
             <UserRoutes />
        ) : (
            // 비로그인 상태 (홈페이지만 접근 가능, 나머지는 로그인 페이지로 리디렉션)
             <Routes>
                <Route path="/" element={<HomePage />} />
                {/* /login, /signup 외 다른 경로는 로그인 페이지로 */}
                 <Route path="*" element={<Navigate to="/login" replace />} />
             </Routes>
        )}
        {/* Toaster는 로그인 여부와 관계없이 필요할 수 있으므로 여기에 배치 */}
        <Toaster />
    </>
  );
}

export default App;
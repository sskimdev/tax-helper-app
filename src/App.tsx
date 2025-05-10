// src/App.tsx
import { MainLayout } from '@/components/layout/MainLayout';
// ProLayout import는 제거 (각 페이지에서 직접 사용)
import { Routes, Route, Navigate } from 'react-router-dom'; // Navigate import 유지
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
            <Route path="/pro/*" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
        {/* Toaster는 App 최상위로 이동 */}
    </MainLayout>
);

// 전문가 사용자 라우트 그룹 정의 (레이아웃 없이 라우트만 정의)
const ProRoutesGroup = () => (
     <Routes>
        <Route path="/pro/dashboard" element={<ProDashboardPage />} />
        <Route path="/pro/requests" element={<AssignedRequestsPage />} />
        {/* 전문가 의뢰 상세 페이지 라우트 추가 */}
        <Route path="/pro/requests/:id" element={<ProRequestDetailPage />} />
         {/* 일반 사용자 경로 접근 시 대시보드로 리디렉션 */}
         <Route path="/" element={<Navigate to="/pro/dashboard" replace />} />
         <Route path="/request-filing" element={<Navigate to="/pro/dashboard" replace />} />
         <Route path="/my-filings/*" element={<Navigate to="/pro/dashboard" replace />} />
         <Route path="/experts/*" element={<Navigate to="/pro/dashboard" replace />} />
         {/* 전문가용 NotFound */}
         <Route path="*" element={<NotFoundPage />} />
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
         {/* 로그인/회원가입은 항상 접근 가능하도록 별도 Routes 구성 */}
         <Routes>
             <Route path="/login" element={<LoginPage />} />
             <Route path="/signup" element={<SignupPage />} />
         </Routes>

        {/* 로그인 상태 및 역할에 따라 다른 라우트 그룹 렌더링 */}
        {/* session이 있고 전문가이면 ProRoutesGroup 렌더링 */}
        {session && isProfessional && <ProRoutesGroup />}
        {/* session이 있고 일반사용자이면 UserRoutes 렌더링 */}
        {session && !isProfessional && <UserRoutes />}
        {/* 비로그인 상태이면 공통 페이지(홈) 또는 로그인 페이지로 리디렉션 */}
        {!session && (
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                {/* 전문가 목록/상세는 비로그인도 접근 가능하게 하려면 여기에 추가 */}
                <Route path="/experts" element={<ExpertsPage />} />
                <Route path="/experts/:id" element={<ExpertDetailPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        )}
        {/* Toaster는 앱 전체에 하나만 존재하도록 최상위 배치 */}
        <Toaster />
    </>
  );
}

export default App;
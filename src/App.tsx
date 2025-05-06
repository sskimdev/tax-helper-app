// src/App.tsx
import { MainLayout } from '@/components/layout/MainLayout';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { useAuth } from './contexts/AuthContext'; // useAuth 임포트

// 임시 페이지 컴포넌트 (나중에 실제 컴포넌트로 대체)
const RequestFilingPage = () => {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />; // 로그인 안 했으면 로그인 페이지로
  return <div><h1>신고 의뢰하기 페이지 (보호됨)</h1><p>로그인한 사용자만 접근 가능합니다.</p></div>;
}
const ExpertsPage = () => <div><h1>전문가 찾기 페이지</h1></div>;
const MyFilingsPage = () => {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <div><h1>나의 의뢰내역 페이지 (보호됨)</h1></div>;
}
const NotFoundPage = () => <div><h1>404 - 페이지를 찾을 수 없습니다.</h1></div>;


function App() {
  const { isLoading } = useAuth(); // 로딩 상태 가져오기

  if (isLoading) {
    // 로딩 중 UI (예: 스피너)
    // 간단한 텍스트로 대체. 실제로는 스켈레톤 UI나 스피너 컴포넌트 사용
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* 보호된 라우트 예시 */}
        <Route path="/request-filing" element={<RequestFilingPage />} />
        <Route path="/my-filings" element={<MyFilingsPage />} />

        {/* 일반 라우트 */}
        <Route path="/experts" element={<ExpertsPage />} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
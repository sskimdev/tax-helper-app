// src/App.tsx
import { MainLayout } from '@/components/layout/MainLayout';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { RequestFilingPage } from './pages/RequestFilingPage';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster"; // Toaster 컴포넌트를 여기서 import 합니다.
import { MyFilingsPage } from './pages/MyFilingsPage'; // 실제 컴포넌트 import
import { ExpertsPage } from './pages/ExpertsPage'; // 실제 컴포넌트 import

// 임시 페이지 컴포넌트
// const ExpertsPage = () => <div><h1>전문가 찾기 페이지</h1></div>;
// const MyFilingsPage = () => {
//   const { session } = useAuth();
//   if (!session) return <Navigate to="/login" replace />;
//   return <div><h1>나의 의뢰내역 페이지 (보호됨)</h1><p>의뢰가 성공적으로 접수되면 여기 목록이 나타납니다.</p></div>;
// }

const NotFoundPage = () => <div><h1>404 - 페이지를 찾을 수 없습니다.</h1></div>;


function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/request-filing" element={<RequestFilingPage />} />
        <Route path="/my-filings" element={<MyFilingsPage />} />
        {/* 상세 페이지 라우트 추가 */}
        <Route path="/my-filings/:id" element={<FilingRequestDetailPage />} />
        <Route path="/experts" element={<ExpertsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {/* Toaster 컴포넌트를 MainLayout 내부, Routes 외부에 렌더링합니다. */}
      <Toaster />
    </MainLayout>
  );
}

export default App;
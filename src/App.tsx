// src/App.tsx
import { MainLayout } from '@/components/layout/MainLayout';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { RequestFilingPage } from './pages/RequestFilingPage';
import { MyFilingsPage } from './pages/MyFilingsPage';
import { FilingRequestDetailPage } from './pages/FilingRequestDetailPage';
import { EditFilingRequestPage } from './pages/EditFilingRequestPage'; // 수정 페이지 import
import { ExpertsPage } from './pages/ExpertsPage';
import { ExpertDetailPage } from './pages/ExpertDetailPage';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";

const NotFoundPage = () => <div><h1>404 - 페이지를 찾을 수 없습니다.</h1></div>;

function App() {
  const { isLoading }: { isLoading: boolean } = useAuth(); // 타입 명시

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
        <Route path="/my-filings/:id" element={<FilingRequestDetailPage />} />
        {/* 의뢰 수정 페이지 라우트 추가 */}
        <Route path="/my-filings/:id/edit" element={<EditFilingRequestPage />} />
        <Route path="/experts" element={<ExpertsPage />} />
        <Route path="/experts/:id" element={<ExpertDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </MainLayout>
  );
}

export default App;
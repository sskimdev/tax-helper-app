// src/pages/HomePage.tsx
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export function HomePage() {
  const { user, session } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">종합소득세 신고, 이제 전문가에게 맡기세요!</h1>
      <p className="mb-4">
        복잡하고 어려운 종합소득세 신고, 더 이상 혼자 고민하지 마세요.
        경험 많은 세무 전문가가 쉽고 빠르게 해결해 드립니다.
      </p>
      
      {session ? (
        <div>
          <p className="mb-4">환영합니다, {user?.email} 님!</p>
          <Link to="/request-filing">
            <Button size="lg">신고 의뢰 시작하기</Button>
          </Link>
        </div>
      ) : (
        <div>
          <p className="mb-4">지금 바로 회원가입하고 편리한 신고 대행 서비스를 경험해보세요.</p>
          <Link to="/signup">
            <Button size="lg" className="mr-2">무료 회원가입</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">로그인</Button>
          </Link>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-semibold mb-3">서비스 주요 기능</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>간편한 온라인 신고 의뢰</li>
          <li>실력있는 세무 전문가 매칭</li>
          <li>실시간 상담 및 진행 상황 확인</li>
          <li>투명한 수수료 정책</li>
        </ul>
      </section>
    </div>
  );
}
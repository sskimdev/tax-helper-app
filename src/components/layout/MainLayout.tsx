// src/components/layout/MainLayout.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from 'react-router-dom'; // Link, useNavigate 임포트
import { useAuth } from '@/contexts/AuthContext'; // useAuth 임포트

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { session, signOut, user } = useAuth(); // AuthContext 사용
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/'); // 로그아웃 후 홈으로 이동
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold sm:inline-block">종합소득세 앱</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link to="/request-filing" className="transition-colors hover:text-foreground/80 text-foreground/60">
                신고 의뢰하기
              </Link>
              <Link to="/experts" className="transition-colors hover:text-foreground/80 text-foreground/60">
                전문가 찾기
              </Link>
              {session && (
                <Link to="/my-filings" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  나의 의뢰내역
                </Link>
              )}
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            {session ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user?.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">로그인</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">회원가입</Button>
                </Link>
              </>
            )}
            {/* TODO: 다크 모드 토글 버튼 추가 */}
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6">
        {children}
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} 종합소득세 신고 도우미. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
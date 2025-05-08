// src/components/layout/ProLayout.tsx
import React, { type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext'; // 기본 useAuth 사용 (로그아웃 등)
import { useProAuth } from '@/hooks/useProAuth'; // useProAuth 사용 (전문가 이름 등)
import { LayoutDashboard, Files, LogOut } from 'lucide-react'; // 아이콘 추가

interface ProLayoutProps {
  children: ReactNode;
}

export function ProLayout({ children }: ProLayoutProps): React.ReactElement {
  const { signOut } = useAuth();
  const { professionalProfile } = useProAuth();
  const navigate = useNavigate();
  const location = useLocation(); // 현재 경로 확인용

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate('/'); // 로그아웃 후 홈으로 이동
  };

  // 네비게이션 아이템 정의
  const navItems: Array<{ href: string; label: string; icon: React.ElementType }> = [
    { href: '/pro/dashboard', label: '대시보드', icon: LayoutDashboard },
    { href: '/pro/requests', label: '배정된 의뢰', icon: Files },
    // { href: '/pro/profile', label: '내 프로필', icon: User }, // 추후 구현
    // { href: '/pro/settings', label: '설정', icon: Settings }, // 추후 구현
  ];

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* 사이드바 */}
      <aside className="hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-[60px] items-center border-b px-6">
          <Link to="/pro/dashboard" className="flex items-center gap-2 font-semibold">
            {/* 로고 또는 앱 이름 */}
            <span className="">전문가 센터</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <ul className="grid items-start px-4 text-sm font-medium">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link to={item.href}>
                  <Button
                    variant={location.pathname === item.href ? 'secondary' : 'ghost'} // 현재 경로면 secondary 스타일
                    className="w-full justify-start gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* 사이드바 하단 (로그아웃 등) */}
        <div className="mt-auto p-4 border-t">
           <div className="text-sm mb-2 text-muted-foreground">
             {professionalProfile?.name ? `${professionalProfile.name} 세무사` : '전문가 계정'}
           </div>
           <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleSignOut}>
             <LogOut className="h-4 w-4" />
             로그아웃
           </Button>
         </div>
      </aside>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex flex-1 flex-col">
        {/* 상단 헤더 (필요시) */}
        {/*
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
           모바일용 네비게이션 토글, 검색 등 위치
        </header>
         */}
        <main className="flex-1 p-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
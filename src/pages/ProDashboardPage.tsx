// src/pages/ProDashboardPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProAuth } from '@/hooks/useProAuth'; // 전문가 인증 훅 사용
import { ProLayout } from '@/components/layout/ProLayout'; // 전문가 레이아웃 사용
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function ProDashboardPage(): React.ReactElement {
  const { isProfessional, professionalProfile, isLoadingPro } = useProAuth();
  const navigate = useNavigate(); // 필요시 페이지 이동용

  // 전문가 정보 로딩 완료 후, 전문가가 아니면 홈으로 리디렉션
  useEffect(() => {
    if (!isLoadingPro && !isProfessional) {
      console.log("전문가 아님, 홈으로 리디렉션...");
      navigate('/');
    }
  }, [isLoadingPro, isProfessional, navigate]);

  // 로딩 중 표시
  if (isLoadingPro) {
    return <div className="flex items-center justify-center min-h-screen">전문가 정보 확인 중...</div>;
  }

  // 전문가가 아닌 경우 (리디렉션 되기 전 잠시 표시될 수 있음)
  if (!isProfessional) {
     // 혹은 null을 반환하여 리디렉션을 기다리게 할 수도 있음
     return <div className="flex items-center justify-center min-h-screen">접근 권한이 없습니다.</div>;
     // return null;
  }

  // 전문가인 경우 실제 대시보드 내용 표시
  return (
    <ProLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          환영합니다, {professionalProfile?.name || '전문가'}님!
        </h1>
        <p className="text-muted-foreground">
          전문가 대시보드입니다. 여기서 배정된 의뢰를 확인하고 관리할 수 있습니다.
        </p>
        {/* 대시보드 요약 정보 카드 등 (추후 구현) */}
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>배정된 의뢰</CardTitle>
                    <CardDescription>현재 진행 중인 의뢰 건수</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">N 건</p> {/* TODO: 실제 데이터 연동 */}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>완료된 의뢰</CardTitle>
                    <CardDescription>최근 1개월간 완료 건수</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">M 건</p> {/* TODO: 실제 데이터 연동 */}
                </CardContent>
            </Card>
        </div>
      </div>
    </ProLayout>
  );
}
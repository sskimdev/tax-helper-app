// src/pages/AssignedRequestsPage.tsx
import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import { useProAuth } from '@/hooks/useProAuth'; // 전문가 인증 훅
import { ProLayout } from '@/components/layout/ProLayout'; // 전문가 레이아웃
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest } from '@/types/filingRequest'; // 의뢰 타입
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';

export function AssignedRequestsPage(): React.ReactElement {
  const { isProfessional, professionalProfile, isLoadingPro } = useProAuth();
//   const navigate = useNavigate();

  // 상태 타입 명시
  const [assignedRequests, setAssignedRequests] = useState<FilingRequest[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true); // 데이터 로딩 상태
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssignedRequests(): Promise<void> {
      // 전문가 프로필 로딩 중이거나 전문가가 아니거나 프로필 없으면 중단
      if (isLoadingPro || !isProfessional || !professionalProfile?.id) {
         // 로딩이 끝났는데 전문가가 아니라면 데이터 로딩 시도 안함
         if (!isLoadingPro && !isProfessional) {
             setLoadingData(false);
         }
        return;
      }

      setLoadingData(true);
      setError(null);
      try {
        // RLS 정책을 활용하여 배정된 의뢰 조회
        // assigned_professional_id = professionalProfile.id 조건이 RLS에서 처리됨
        const { data, error: dbError } = await supabase
          .from('filing_requests')
          .select<'*', FilingRequest>('*') // 타입 명시
          // RLS 정책이 적용되므로 별도 eq 조건 불필요 (필요시 추가 가능)
          // .eq('assigned_professional_id', professionalProfile.id)
          .order('created_at', { ascending: true }); // 오래된 순서대로

        if (dbError) throw dbError;

        setAssignedRequests(data || []);
      } catch (err: unknown) {
        console.error("Error fetching assigned requests:", err);
        let message = "배정된 의뢰 목록을 불러오는 중 오류 발생";
        if (err instanceof Error) message = err.message;
        setError(message);
      } finally {
        setLoadingData(false);
      }
    }

    // 전문가 정보 로딩이 끝난 후 데이터 조회 시작
    if (!isLoadingPro) {
        fetchAssignedRequests();
    }

  }, [isProfessional, professionalProfile, isLoadingPro]); // 전문가 상태 변경 시 재조회

  // 전문가 정보 로딩 중 또는 데이터 로딩 중
  if (isLoadingPro || loadingData) {
    return (
      <ProLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">배정된 의뢰 목록</h1>
          <p>데이터를 불러오는 중입니다...</p>
        </div>
      </ProLayout>
    );
  }

  // 전문가가 아닌 경우 리디렉션 (ProDashboardPage와 유사하게 처리)
  if (!isProfessional) {
     // navigate('/'); // useEffect에서 처리하므로 여기선 로딩 또는 빈 화면 표시 가능
     return (
         <ProLayout>
             <div className="space-y-4">
                 <h1 className="text-2xl font-semibold">접근 권한 없음</h1>
                 <p>전문가 계정으로 로그인해주세요.</p>
             </div>
         </ProLayout>
     );
  }

  // 에러 발생 시
  if (error) {
    return (
      <ProLayout>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">배정된 의뢰 목록</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </ProLayout>
    );
  }

  // 상태(status) 관련 함수 (FilingRequestDetailPage와 동일하게 사용 가능)
  const getStatusVariant = (status: FilingRequest['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'submitted': return 'secondary';
        case 'assigned': case 'processing': return 'default';
        case 'completed': return 'outline';
        case 'cancelled': return 'destructive';
        default: return 'secondary';
    }
};
const translateStatus = (status: FilingRequest['status']): string => {
    switch (status) {
        case 'submitted': return '접수 완료';
        case 'assigned': return '전문가 배정됨';
        case 'processing': return '신고 진행 중';
        case 'completed': return '신고 완료';
        case 'cancelled': return '취소됨';
        default: return status;
    }
};

  return (
    <ProLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">배정된 의뢰 목록</h1>
        {/* TODO: 필터링 기능 (상태별, 기간별 등) */}

        {assignedRequests.length === 0 ? (
          <p>현재 배정된 의뢰가 없습니다.</p>
        ) : (
          <Table>
            <TableCaption>나에게 배정된 의뢰 목록입니다.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">신고 연도</TableHead>
                <TableHead>소득 종류</TableHead>
                <TableHead>접수일</TableHead>
                {/* TODO: 의뢰인 정보 표시 (별도 조회 또는 조인 필요) */}
                {/* <TableHead>의뢰인</TableHead> */}
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.tax_year}년</TableCell>
                  <TableCell>{request.income_type}</TableCell>
                  <TableCell>{formatDate(request.created_at)}</TableCell>
                  {/* <TableCell>{request.user_id}</TableCell> */}
                  <TableCell>
                    <Badge variant={getStatusVariant(request.status)}>
                      {translateStatus(request.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* TODO: 전문가용 상세 보기 페이지 또는 관리 액션 버튼 */}
                    <Button variant="outline" size="sm">상세/관리</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </ProLayout>
  );
}
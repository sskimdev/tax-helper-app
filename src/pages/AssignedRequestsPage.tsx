// src/pages/AssignedRequestsPage.tsx
import { useState, useEffect } from 'react'; // React import 제거
import { Link } from 'react-router-dom'; // useNavigate 제거, Link만 사용
import { useProAuth } from '@/hooks/useProAuth';
import { ProLayout } from '@/components/layout/ProLayout';
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest } from '@/types/filingRequest';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';

// 반환 타입을 React.ReactNode 또는 JSX.Element로 명시 (일반적으로 ReactNode가 더 유연)
function AssignedRequestsPage(): React.ReactNode {
  const { isProfessional, professionalProfile, isLoadingPro } = useProAuth();
  // const navigate = useNavigate(); // navigate 변수 제거

  const [assignedRequests, setAssignedRequests] = useState<FilingRequest[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssignedRequests(): Promise<void> {
      if (isLoadingPro || !isProfessional || !professionalProfile?.id) {
         if (!isLoadingPro && !isProfessional) {
             setLoadingData(false);
         }
        return;
      }

      setLoadingData(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('filing_requests')
          .select<'*', FilingRequest>('*')
          .order('created_at', { ascending: true });

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

    if (!isLoadingPro) {
        fetchAssignedRequests();
    }

  }, [isProfessional, professionalProfile, isLoadingPro]);

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

  if (!isProfessional && !isLoadingPro) {
     return (
         <ProLayout>
             <div className="space-y-4">
                 <h1 className="text-2xl font-semibold">접근 권한 없음</h1>
                 <p>전문가 계정으로 로그인해주세요.</p>
             </div>
         </ProLayout>
     );
  }

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

  const getStatusVariant = (status: FilingRequest['status']): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
        case 'submitted': return 'secondary';
        case 'assigned': return 'default';
        case 'processing': return 'default';
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
                  <TableCell>
                    <Badge variant={getStatusVariant(request.status)}>
                      {translateStatus(request.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/pro/requests/${request.id}`}>
                      <Button variant="outline" size="sm">상세/관리</Button>
                    </Link>
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

export default AssignedRequestsPage;
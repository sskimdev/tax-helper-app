// src/pages/FilingRequestDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest } from '@/types/filingRequest'; // 타입 import
import { formatDate } from '@/lib/utils'; // 날짜 포맷 함수 import

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
// import { Skeleton } from "@/components/ui/skeleton"; // Skeleton 사용 시

// 상세 정보 항목 표시를 위한 Helper 컴포넌트 (선택 사항)
const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-4 items-start">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="text-sm col-span-2">{value || '-'}</dd> {/* 값이 없으면 '-' 표시 */}
  </div>
);

export function FilingRequestDetailPage() {
  const { id } = useParams<{ id: string }>(); // URL 파라미터에서 id 가져오기
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<FilingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequestDetail() {
      if (!id || !user) {
        setError("잘못된 접근입니다.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Supabase에서 특정 id의 filing_requests 데이터 가져오기
        // RLS 정책에 의해 자신의 데이터가 아니면 에러 또는 null 반환
        const { data, error: dbError } = await supabase
          .from('filing_requests')
          .select('*')
          .eq('id', id)
          .single(); // 단일 행만 가져옴

        if (dbError) {
          // RLS에 의해 접근 권한이 없으면 PostgREST 에러(404 Not Found 또는 401 Unauthorized 등) 발생 가능
          if (dbError.code === 'PGRST116') { // Not Found 에러 코드 예시 (실제 코드 확인 필요)
             setError("해당 의뢰 내역을 찾을 수 없거나 접근 권한이 없습니다.");
          } else {
              throw dbError;
          }
          setRequest(null);
        } else if (data) {
          setRequest(data);
        } else {
           setError("해당 의뢰 내역을 찾을 수 없습니다.");
           setRequest(null);
        }

      } catch (err: any) {
        console.error("Error fetching request detail:", err);
        setError(`상세 정보를 불러오는 중 오류가 발생했습니다: ${err.message}`);
        setRequest(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRequestDetail();
  }, [id, user]); // id 또는 user가 변경되면 다시 불러옴

  // 로딩 상태 표시
  if (loading) {
     return (
        <div className="space-y-4 max-w-2xl mx-auto">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-semibold">의뢰 상세 정보</h1>
                 {/* 뒤로가기 버튼 Skeleton */}
            </div>
            <Card>
                <CardHeader>
                    {/* 제목 Skeleton */}
                </CardHeader>
                <CardContent className="space-y-4">
                   {/* 내용 Skeleton */}
                   <p>상세 정보를 불러오는 중입니다...</p>
                </CardContent>
            </Card>
        </div>
     );
  }

   // 로그인하지 않은 경우
   if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 에러 또는 데이터 없음 상태 표시
  if (error || !request) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
         <div className="flex justify-between items-center">
             <h1 className="text-2xl font-semibold">의뢰 상세 정보</h1>
              <Button variant="outline" onClick={() => navigate('/my-filings')}>목록으로</Button>
         </div>
        <p className="text-red-500">{error || "의뢰 내역을 찾을 수 없습니다."}</p>
      </div>
    );
  }

  // 상태(status) 관련 함수 (MyFilingsPage와 동일하게 사용 가능)
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
   }

  // 예상 수입 포맷 (toLocaleString 활용)
  const formatIncome = (income?: number | null) => {
      if (income === null || income === undefined) return '-';
      return income.toLocaleString('ko-KR') + ' 원';
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
             <h1 className="text-2xl font-semibold">의뢰 상세 정보</h1>
             <Button variant="outline" onClick={() => navigate('/my-filings')}>목록으로</Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>{request.tax_year}년 귀속 종합소득세 신고 의뢰</CardTitle>
                <CardDescription>제출일: {formatDate(request.created_at)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <dl className="space-y-4">
                    <DetailItem label="의뢰 상태" value={<Badge variant={getStatusVariant(request.status)}>{translateStatus(request.status)}</Badge>} />
                    <Separator />
                    <DetailItem label="신고 대상 연도" value={`${request.tax_year}년`} />
                    <DetailItem label="주요 소득 종류" value={request.income_type} />
                    <DetailItem label="연간 총 수입 금액" value={formatIncome(request.estimated_income)} />
                    <Separator />
                    <DetailItem label="추가 요청 사항" value={request.details || '없음'} />
                     {/* TODO: 배정된 전문가 정보, 수수료, 결제 상태 등 추가 표시 */}
                </dl>

                 {/* TODO: 상태에 따른 추가 액션 버튼 (예: 수정하기, 취소하기, 결제하기 등) */}
                 {request.status === 'submitted' && (
                     <div className="pt-4">
                         {/* <Button variant="outline" className="mr-2">수정하기</Button> */}
                         {/* <Button variant="destructive">의뢰 취소하기</Button> */}
                     </div>
                 )}
            </CardContent>
        </Card>
    </div>
  );
}
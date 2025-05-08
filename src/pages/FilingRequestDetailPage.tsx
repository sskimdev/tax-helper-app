// src/pages/FilingRequestDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Link 제거 (필요시 다시 추가)
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest } from '@/types/filingRequest'; // 타입 import
import { formatDate } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // AlertDialog 관련 컴포넌트 import
import { useToast } from "@/hooks/use-toast"; // useToast import 확인

// 상세 정보 항목 표시 Helper 컴포넌트 (이전 단계와 동일)
const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-4 items-start">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm col-span-2">{value || '-'}</dd>
    </div>
);


export function FilingRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast(); // useToast 훅 사용 확인

  // 상태 타입 명시
  const [request, setRequest] = useState<FilingRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false); // 취소 진행 상태
  // const [isCancelAlertOpen, setIsCancelAlertOpen] = useState<boolean>(false); // AlertDialogTrigger 사용 시 불필요

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
        const { data, error: dbError } = await supabase
          .from('filing_requests')
          .select('*')
          .eq('id', id)
          .single(); // 단일 행만 가져옴

        if (dbError) {
          // .single() 에러 처리: 결과가 없거나(Not Found) 1개 초과일 경우 에러 발생
          // PGRST116 코드가 대표적 (No rows found / More than one row found)
          // 접근 권한 문제는 보통 401/403 에러를 API 레벨에서 반환하지만,
          // .single()과 RLS 조합 시 PGRST116으로 나타날 수 있음.
          if (dbError.code === 'PGRST116') {
             setError("해당 의뢰 내역을 찾을 수 없거나 접근 권한이 없습니다.");
          } else {
              // 다른 종류의 DB 에러일 경우 그대로 throw
              console.error("Supabase DB Error:", dbError);
              throw new Error(`데이터베이스 오류: ${dbError.message} (코드: ${dbError.code})`);
          }
          setRequest(null);
        } else {
          // 에러 없이 data가 반환된 경우 (정상적으로 1개 행 찾음)
          setRequest(data);
        }

      } catch (err: any) {
        console.error("Error fetching request detail:", err);
        // catch 블록에서는 이미 설정된 에러 메시지(setError)가 있다면 그것을 유지하거나,
        // 새로운 에러 메시지로 덮어쓸 수 있음. 여기서는 명시적으로 설정.
        setError(err.message || "상세 정보를 불러오는 중 알 수 없는 오류가 발생했습니다.");
        setRequest(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRequestDetail();
  }, [id, user]);

  // 의뢰 취소 처리 함수
  const handleConfirmCancel = async (): Promise<void> => {
      // request.id 와 user.id 가 유효한지 다시 한번 확인 (타입스크립트 non-null assertion 대신)
      if (!request?.id || !user?.id) {
          toast({ title: "오류", description: "취소할 의뢰 정보를 찾을 수 없습니다.", variant: "destructive" });
          return;
      }
      // 'submitted' 상태가 아닐 경우 방지
      if (request.status !== 'submitted') {
           toast({ title: "알림", description: "이미 처리 중이거나 완료/취소된 의뢰는 취소할 수 없습니다.", variant: "default" });
           return;
      }

      setIsCancelling(true);
      try {
          const { error: updateError } = await supabase
              .from('filing_requests')
              .update({ status: 'cancelled' }) // 상태를 'cancelled'로 변경
              .eq('id', request.id) // 특정 ID에 대해
              .eq('user_id', user.id) // 사용자 ID 일치 (RLS로도 보호되지만 명시)
              .eq('status', 'submitted'); // 현재 상태가 'submitted'인지 확인 (안전 장치)
              // .select() // 업데이트 후 데이터를 다시 받아올 필요는 없음 (로컬 상태 업데이트)

          if (updateError) {
              throw updateError;
          }

          // 로컬 상태 업데이트하여 UI 즉시 반영
          setRequest((prevRequest) => {
              if (!prevRequest) return null;
              // 타입 안정성을 위해 새로운 객체 반환
              const updatedRequest: FilingRequest = { ...prevRequest, status: 'cancelled' };
              return updatedRequest;
          });

          toast({ title: "성공", description: "의뢰가 성공적으로 취소되었습니다." });
          // setIsCancelAlertOpen(false); // AlertDialogTrigger 사용 시 불필요

      } catch (err: any) {
          console.error("Error cancelling request:", err);
          toast({ title: "오류", description: `의뢰 취소 중 오류가 발생했습니다: ${err.message}`, variant: "destructive" });
      } finally {
          setIsCancelling(false);
      }
  };

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
  if (!session) { return <Navigate to="/login" replace />; }

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
                </dl>

                 {/* 상태가 'submitted'일 때만 취소 버튼 표시 */}
                 {request.status === 'submitted' && (
                     <div className="pt-4 border-t">
                         <AlertDialog>
                             <AlertDialogTrigger asChild>
                                 <Button variant="destructive" disabled={isCancelling}>
                                     {isCancelling ? '취소 처리 중...' : '의뢰 취소하기'}
                                 </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                                 <AlertDialogHeader>
                                     <AlertDialogTitle>의뢰 취소 확인</AlertDialogTitle>
                                     <AlertDialogDescription>
                                         정말로 이 신고 의뢰를 취소하시겠습니까? 취소된 의뢰는 다시 되돌릴 수 없으며, 전문가 매칭이 진행되지 않습니다.
                                     </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                     <AlertDialogCancel disabled={isCancelling}>닫기</AlertDialogCancel>
                                     <AlertDialogAction onClick={handleConfirmCancel} disabled={isCancelling}>
                                         확인 (취소)
                                     </AlertDialogAction>
                                 </AlertDialogFooter>
                             </AlertDialogContent>
                         </AlertDialog>
                         {/* <Button variant="outline" className="ml-2">수정하기</Button> */}
                     </div>
                 )}

                  {/* 상태가 'cancelled'일 때 메시지 표시 */}
                  {request.status === 'cancelled' && (
                      <p className="text-sm text-destructive pt-4 border-t">이 의뢰는 사용자에 의해 취소되었습니다.</p>
                  )}
            </CardContent>
        </Card>
    </div>
  );
}
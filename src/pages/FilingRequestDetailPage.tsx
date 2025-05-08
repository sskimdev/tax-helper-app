// src/pages/FilingRequestDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Link import 확인
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest } from '@/types/filingRequest'; // 타입 import 확인
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast"; // useToast import 확인

// 상세 정보 항목 표시 Helper 컴포넌트
const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-4 items-start">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm col-span-2">{value || '-'}</dd>
    </div>
);

export function FilingRequestDetailPage() {
  // useParams 타입 명시
  const { id } = useParams<{ id: string }>();
  // useAuth 반환 타입 명시 (AuthContextType에 따라)
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // 상태 타입 명시
  const [request, setRequest] = useState<FilingRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  useEffect(() => {
    async function fetchRequestDetail(): Promise<void> { // 반환 타입 명시
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
              .select<'*', FilingRequest>('*') // select 타입 제네릭 명시
              .eq('id', id)
              .single(); // .single()은 결과가 1개가 아니면 에러 발생

          if (dbError) {
              if (dbError.code === 'PGRST116') { // 결과 없음 또는 여러 개
                   setError("해당 의뢰 내역을 찾을 수 없거나 접근 권한이 없습니다.");
              } else {
                  console.error("Supabase DB Error:", dbError);
                  throw new Error(`데이터베이스 오류: ${dbError.message} (코드: ${dbError.code})`);
              }
              setRequest(null);
          } else {
              // data가 null이 아님을 TypeScript가 알 수 있음 (single() 덕분)
              setRequest(data);
          }
      } catch (err: unknown) { // unknown 타입 사용 후 타입 가드
          console.error("Error fetching request detail:", err);
          let message = "상세 정보를 불러오는 중 알 수 없는 오류가 발생했습니다.";
          if (err instanceof Error) {
              message = err.message;
          }
          setError(message);
          setRequest(null);
      } finally {
          setLoading(false);
      }
    }
    fetchRequestDetail();
  }, [id, user]);

  const handleConfirmCancel = async (): Promise<void> => {
      if (!request?.id || !user?.id) {
          toast({ title: "오류", description: "취소할 의뢰 정보를 찾을 수 없습니다.", variant: "destructive" });
          return;
      }
      if (request.status !== 'submitted') {
           toast({ title: "알림", description: "이미 처리 중이거나 완료/취소된 의뢰는 취소할 수 없습니다.", variant: "default" });
           return;
      }

      setIsCancelling(true);
      try {
          const { error: updateError } = await supabase
              .from('filing_requests')
              .update({ status: 'cancelled' })
              .eq('id', request.id)
              .eq('user_id', user.id)
              .eq('status', 'submitted');

          if (updateError) throw updateError;

          // setRequest 타입 안정성 고려
          setRequest((prev) => {
              if (!prev) return null;
              const updatedRequest: FilingRequest = { ...prev, status: 'cancelled' };
              return updatedRequest;
          });

          toast({ title: "성공", description: "의뢰가 성공적으로 취소되었습니다." });

      } catch (err: unknown) { // unknown 타입 사용
          console.error("Error cancelling request:", err);
          let message = "의뢰 취소 중 알 수 없는 오류가 발생했습니다.";
          if (err instanceof Error) {
              message = err.message;
          }
          toast({ title: "오류", description: message, variant: "destructive" });
      } finally {
          setIsCancelling(false);
      }
  };

  // --- Loading, Error, Not Logged In UI ---
  if (loading) {
       return <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">로딩 중...</div>;
  }
  if (!session) {
       return <Navigate to="/login" replace />;
  }
  if (error || !request) {
       return (
           <div className="space-y-4 max-w-2xl mx-auto p-4">
              <div className="flex justify-between items-center mb-4">
                  <h1 className="text-2xl font-semibold">오류</h1>
                  <Button variant="outline" onClick={() => navigate('/my-filings')}>목록으로</Button>
              </div>
              <p className="text-red-500">{error || "의뢰 내역을 찾을 수 없습니다."}</p>
           </div>
       );
  }
  // ---------------------------------------

  // --- Status formatting functions ---
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
   const formatIncome = (income?: number | null): string => {
       if (income === null || income === undefined) return '-';
       try {
           return income.toLocaleString('ko-KR') + ' 원';
       } catch {
           return '금액 표시 오류';
       }
   };
   // ---------------------------------------

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

                 {/* 상태가 'submitted'일 때 수정 및 취소 버튼 표시 */}
                 {request.status === 'submitted' && (
                     <div className="pt-4 border-t flex space-x-2">
                         <Link to={`/my-filings/${request.id}/edit`}>
                             <Button variant="outline" disabled={isCancelling}>수정하기</Button>
                         </Link>
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
                     </div>
                 )}

                  {/* 상태가 'cancelled'일 때 메시지 표시 */}
                  {request.status === 'cancelled' && (
                      <p className="text-sm text-destructive pt-4 border-t">이 의뢰는 사용자에 의해 취소되었습니다.</p>
                  )}
                  {/* 다른 상태 (assigned, processing, completed) 일때 메시지 */}
                  {['assigned', 'processing', 'completed'].includes(request.status) && (
                       <p className="text-sm text-muted-foreground pt-4 border-t">이미 전문가에게 배정되었거나 처리가 시작/완료된 의뢰는 수정하거나 취소할 수 없습니다.</p>
                  )}
            </CardContent>
        </Card>
    </div>
  );
}
// src/pages/ProRequestDetailPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
// import { useAuth } from '@/contexts/AuthContext'; // useAuth가 직접 사용되지 않으면 제거
import { useProAuth } from '@/hooks/useProAuth';
import { ProLayout } from '@/components/layout/ProLayout';
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest } from '@/types/filingRequest';
import { formatDate } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-4 items-start py-2">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm col-span-2">{value || '-'}</dd>
    </div>
);

export function ProRequestDetailPage(): React.ReactNode {
  const { id: requestId } = useParams<{ id: string }>();
  // const { user: authUser } = useAuth(); // authUser가 직접 사용되지 않으면 제거 또는 주석 처리
  const { isProfessional, professionalProfile, isLoadingPro } = useProAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [request, setRequest] = useState<FilingRequest | null>(null);
  const [client, setClient] = useState<Pick<User, 'id' | 'email'> | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // 'loading' 변수 선언
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const loadRequestAndClientData = useCallback(async (): Promise<void> => {
    if (isLoadingPro) return;

    if (!isProfessional || !professionalProfile?.id || !requestId) {
      setError(isProfessional ? "의뢰 ID가 유효하지 않습니다." : "전문가만 접근할 수 있습니다.");
      setLoading(false); // 로딩 상태 해제
      return;
    }

    setLoading(true); // 데이터 로딩 시작, 여기서 'loading' 사용
    setError(null);
    setClient(null);
    setRequest(null);

    try {
      const { data: requestData, error: requestError } = await supabase
        .from('filing_requests')
        .select<'*', FilingRequest>('*')
        .eq('id', requestId)
        .eq('assigned_professional_id', professionalProfile.id)
        .single();

      if (requestError || !requestData) {
        let errMsg = "의뢰 정보를 불러올 수 없거나 권한이 없습니다.";
        if (requestError?.code === 'PGRST116') {
            errMsg = "해당 의뢰를 찾을 수 없거나 배정된 전문가가 아닙니다.";
        } else if (requestError) {
            errMsg = `데이터 로딩 오류: ${requestError.message}`;
        }
        throw new Error(errMsg);
      }
      setRequest(requestData);

      // ProRequestDetailPage.tsx 내 loadRequestAndClientData 함수 내부
        if (requestData.user_id) {
            try {
                const { data: profileData, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('id, email')
                    .eq('id', requestData.user_id)
                    .single();

                if (profileError) { // profileError가 존재하면 (데이터가 없거나 다른 DB 오류)
                    console.warn(`의뢰인(ID: ${requestData.user_id}) 프로필 정보 조회 실패:`, profileError.message);
                    setClient({ id: requestData.user_id, email: '정보 조회 불가' });
                } else if (profileData) { // profileData가 정상적으로 조회되었을 때
                    setClient({ id: profileData.id, email: profileData.email || '이메일 정보 없음' });
                } else { // profileData가 null인 경우 (이론상 .single()과 profileError 조합이면 여기까지 안 올 수 있음)
                    console.warn(`의뢰인(ID: ${requestData.user_id}) 프로필 정보가 없습니다.`);
                    setClient({ id: requestData.user_id, email: '프로필 없음' });
                }
            } catch (clientFetchError: unknown) {
                console.error("의뢰인 정보 조회 중 예외 발생:", clientFetchError);
                setClient({ id: requestData.user_id, email: '정보 조회 오류' });
            }
        }
    } catch (err: unknown) {
      console.error("Error loading request/client data:", err);
      let message = "데이터 로딩 중 알 수 없는 오류 발생";
      if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setLoading(false); // 데이터 로딩 완료, 여기서 'loading' 사용
    }
  // 의존성 배열에서 authUser 제거 (만약 useAuth를 제거했다면)
  }, [requestId, isProfessional, professionalProfile, isLoadingPro]);

  useEffect(() => {
    loadRequestAndClientData();
  }, [loadRequestAndClientData]);


  const handleUpdateStatus = async (newStatus: 'processing' | 'completed'): Promise<void> => {
      if (!request?.id || !professionalProfile?.id) {
          toast({ title: "오류", description: "상태를 업데이트할 수 없습니다 (의뢰 또는 전문가 정보 없음).", variant: "destructive" });
          return;
      }

      if (newStatus === 'processing' && request.status !== 'assigned') {
          toast({ title: "알림", description: "배정된 의뢰만 처리 시작할 수 있습니다.", variant: "default"});
          return;
      }
      if (newStatus === 'completed' && request.status !== 'processing') {
          toast({ title: "알림", description: "처리 중인 의뢰만 완료 처리할 수 있습니다.", variant: "default"});
          return;
      }

      setIsUpdatingStatus(true);
      try {
          const { error: updateError } = await supabase
              .from('filing_requests')
              .update({ status: newStatus })
              .eq('id', request.id)
              .eq('assigned_professional_id', professionalProfile.id);

          if (updateError) throw updateError;

          setRequest(prev => prev ? { ...prev, status: newStatus } : null);
          toast({ title: "성공", description: `상태가 '${translateStatus(newStatus)}'(으)로 변경되었습니다.` });

      } catch (err: unknown) {
          console.error("Error updating status:", err);
          let message = "상태 업데이트 중 오류 발생";
          if (err instanceof Error) message = err.message;
          toast({ title: "오류", description: message, variant: "destructive" });
      } finally {
          setIsUpdatingStatus(false);
      }
  };

  // 'isLoading'을 'loading'으로 수정
  if (loading || isLoadingPro) {
    return ( <ProLayout><div className="p-4 text-center">정보 로딩 중...</div></ProLayout> );
  }
  if (!isProfessional) {
    return <Navigate to="/" replace />;
  }
  if (error || !request) {
    return (
        <ProLayout>
            <div className="space-y-4 max-w-3xl mx-auto p-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold">오류</h1>
                    <Button variant="outline" onClick={() => navigate('/pro/requests')}>목록으로</Button>
                </div>
                <p className="text-red-500">{error || "의뢰 정보를 찾을 수 없습니다."}</p>
            </div>
        </ProLayout>
    );
  }

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
           case 'assigned': return '배정 완료';
           case 'processing': return '처리 중';
           case 'completed': return '처리 완료';
           case 'cancelled': return '취소됨';
           default: return status;
       }
   };
   const formatIncome = (income?: number | null): string => {
       if (income === null || income === undefined) return '-';
       try { return income.toLocaleString('ko-KR') + ' 원'; }
       catch { return '금액 표시 오류'; }
   };

  return (
    <ProLayout>
        <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">배정된 의뢰 상세 정보</h1>
                <Button variant="outline" onClick={() => navigate('/pro/requests')}>목록으로</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{request.tax_year}년 귀속 종합소득세 신고 의뢰</CardTitle>
                    <CardDescription>
                        의뢰인: {client?.email || '정보 없음'} | 접수일: {formatDate(request.created_at)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <dl className="space-y-2">
                        <DetailItem label="의뢰 상태" value={<Badge variant={getStatusVariant(request.status)}>{translateStatus(request.status)}</Badge>} />
                        <Separator />
                        <DetailItem label="신고 대상 연도" value={`${request.tax_year}년`} />
                        <DetailItem label="주요 소득 종류" value={request.income_type} />
                        <DetailItem label="연간 총 수입 금액" value={formatIncome(request.estimated_income)} />
                        <Separator />
                        <DetailItem label="추가 요청 사항" value={request.details || '없음'} />
                    </dl>

                    { (request.status === 'assigned' || request.status === 'processing') && (
                        <div className="pt-6 border-t mt-6">
                            <h3 className="text-base font-semibold mb-3">업무 처리</h3>
                            <div className="flex space-x-2">
                                {request.status === 'assigned' && (
                                    <Button
                                        onClick={() => handleUpdateStatus('processing')}
                                        disabled={isUpdatingStatus}
                                    >
                                        {isUpdatingStatus ? '처리 중...' : '신고 처리 시작'}
                                    </Button>
                                )}
                                {request.status === 'processing' && (
                                    <Button
                                        onClick={() => handleUpdateStatus('completed')}
                                        disabled={isUpdatingStatus}
                                    >
                                        {isUpdatingStatus ? '처리 중...' : '신고 완료 처리'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                     {request.status === 'completed' && (
                         <p className="text-sm text-green-600 mt-4 pt-4 border-t">이 의뢰는 전문가에 의해 신고 완료 처리되었습니다.</p>
                     )}
                      {request.status === 'cancelled' && (
                         <p className="text-sm text-destructive mt-4 pt-4 border-t">이 의뢰는 사용자에 의해 취소되었습니다.</p>
                     )}
                      {request.status === 'submitted' && (
                         <p className="text-sm text-blue-600 mt-4 pt-4 border-t">이 의뢰는 아직 전문가에게 배정되지 않았습니다.</p>
                     )}
                </CardContent>
            </Card>
        </div>
    </ProLayout>
  );
}
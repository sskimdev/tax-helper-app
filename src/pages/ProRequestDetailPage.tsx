// src/pages/ProRequestDetailPage.tsx
import { useState, useEffect, useCallback } from 'react'; // React import 제거
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
    <div className="grid grid-cols-3 gap-4 items-start">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm col-span-2">{value || '-'}</dd>
    </div>
);

// 반환 타입을 React.ReactNode 또는 JSX.Element로 명시
export function ProRequestDetailPage(): React.ReactNode {
  const { id: requestId } = useParams<{ id: string }>();
  const { user: authUser } = useAuth();
  const { isProfessional, professionalProfile, isLoadingPro } = useProAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [request, setRequest] = useState<FilingRequest | null>(null);
  const [client, setClient] = useState<Pick<User, 'id' | 'email'> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const loadRequestAndClientData = useCallback(async (): Promise<void> => {
    if (isLoadingPro || !isProfessional || !professionalProfile?.id || !requestId || !authUser) {
      if (!isLoadingPro && !isProfessional) {
         setError("전문가만 접근할 수 있습니다.");
      } else if (!isLoadingPro && !requestId) {
         setError("의뢰 ID가 유효하지 않습니다.");
      }
       if (!isLoadingPro) setLoading(false);
       return;
    }

    setLoading(true);
    setError(null);
    setClient(null);
    setRequest(null);

    try {
      const { data: requestData, error: requestError } = await supabase
        .from('filing_requests')
        .select<'*', FilingRequest>('*')
        .eq('id', requestId)
        .single();

      if (requestError || !requestData) {
        throw new Error(requestError?.message || "의뢰 정보를 불러올 수 없거나 권한이 없습니다.");
      }
      setRequest(requestData);

      if (requestData.user_id) {
          try {
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('id, email') // email 타입은 text (string | null)로 가정
                .eq('id', requestData.user_id)
                .single();

                if (profileError || !profileData) {
                    console.warn("의뢰인 프로필 정보를 가져올 수 없습니다:", profileError?.message);
                    setClient({ id: requestData.user_id, email: '정보 조회 불가' });
                } else {
                     // profileData의 타입을 명시적으로 정의하거나, select 시 타입 제네릭 사용
                     // 예시: const { data: profileData, error: profileError } = await supabase
                     // .from('user_profiles')
                     // .select<'id' | 'email', {id: string, email: string | null}>('id, email')
                     // .eq('id', requestData.user_id)
                     // .single();
                     // 그러면 profileData는 {id: string, email: string | null} | null 타입이 됩니다.
                     setClient({ id: profileData.id, email: profileData.email }); // any 없이 직접 접근
                }
          } catch (clientError) {
               console.warn("의뢰인 정보 조회 중 오류:", clientError);
               setClient({ id: requestData.user_id, email: '정보 조회 오류' });
          }
      }
    } catch (err: unknown) {
      console.error("Error loading request/client data:", err);
      let message = "데이터 로딩 중 알 수 없는 오류 발생";
      if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [requestId, authUser, isProfessional, professionalProfile, isLoadingPro]);

  useEffect(() => {
    loadRequestAndClientData();
  }, [loadRequestAndClientData]);


  // newStatus 파라미터 사용하도록 수정 (13단계에서 실제 로직 구현 예정)
  const handleUpdateStatus = async (newStatus: 'processing' | 'completed'): Promise<void> => {
      if (!request?.id || !professionalProfile?.id) {
          toast({ title: "오류", description: "상태를 업데이트할 수 없습니다.", variant: "destructive" });
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
          // 13단계에서 이 부분에 Supabase update 로직 구현
          console.log(`상태를 ${newStatus}(으)로 변경 요청: ${request.id}`);
          // 예시: 로컬 상태만 임시 변경
          // setRequest(prev => prev ? { ...prev, status: newStatus } : null);
          // toast({ title: "임시", description: `상태가 '${translateStatus(newStatus)}'(으)로 변경되었습니다.` });

          const { error: updateError } = await supabase
              .from('filing_requests')
              .update({ status: newStatus }) // newStatus 사용
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

  if (loading || isLoadingPro) {
    return ( <ProLayout><div className="p-4">정보 로딩 중...</div></ProLayout> );
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
           case 'assigned': return '전문가 배정됨';
           case 'processing': return '신고 진행 중';
           case 'completed': return '신고 완료';
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
                    <dl className="space-y-4">
                        <DetailItem label="의뢰 상태" value={<Badge variant={getStatusVariant(request.status)}>{translateStatus(request.status)}</Badge>} />
                        <Separator />
                        <DetailItem label="신고 대상 연도" value={`${request.tax_year}년`} />
                        <DetailItem label="주요 소득 종류" value={request.income_type} />
                        <DetailItem label="연간 총 수입 금액" value={formatIncome(request.estimated_income)} />
                        <Separator />
                        <DetailItem label="추가 요청 사항" value={request.details || '없음'} />
                    </dl>

                    <div className="pt-4 border-t">
                        <h3 className="text-base font-semibold mb-2">업무 처리</h3>
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
                         {request.status === 'completed' && (
                             <p className="text-sm text-green-600 mt-2">이 의뢰는 신고 완료 처리되었습니다.</p>
                         )}
                          {request.status === 'cancelled' && (
                             <p className="text-sm text-destructive mt-2">이 의뢰는 사용자에 의해 취소되었습니다.</p>
                         )}
                    </div>
                </CardContent>
            </Card>
        </div>
    </ProLayout>
  );
}
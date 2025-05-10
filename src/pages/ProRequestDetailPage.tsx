// src/pages/ProRequestDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useProAuth } from '@/hooks/useProAuth';
import { ProLayout } from '@/components/layout/ProLayout';
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest, AttachedFile } from '@/types/filingRequest';
import { formatDate } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';
import { FILING_ATTACHMENTS_BUCKET } from '@/config';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from '@/components/custom/FileUpload';
import { Download, Paperclip, FileText as FileIcon, PlusCircle, Loader2 } from 'lucide-react';
import { LoadingFallback } from '@/components/custom/LoadingFallback';

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 items-start sm:gap-4">
        <dt className="text-sm font-medium text-muted-foreground sm:col-span-1">{label}</dt>
        <dd className="text-sm sm:col-span-2">{value || '-'}</dd>
    </div>
);

export function ProRequestDetailPage(): React.ReactNode {
  const { id: requestId } = useParams<{ id: string }>();
  const { isProfessional, professionalProfile, isLoadingPro } = useProAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [request, setRequest] = useState<FilingRequest | null>(null);
  const [client, setClient] = useState<Pick<User, 'id' | 'email'> | null>(null);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
  const [stagedFilesForNewUpload, setStagedFilesForNewUpload] = useState<File[]>([]);
  const [isUploadingNewFiles, setIsUploadingNewFiles] = useState<boolean>(false);
  const [clearFileUploadSignal, setClearFileUploadSignal] = useState<boolean>(false);

  const loadRequestAndClientData = useCallback(async (): Promise<void> => {
    if (isLoadingPro) return;
    if (!isProfessional || !professionalProfile?.id || !requestId) { setActionError(isProfessional ? "의뢰 ID가 유효하지 않습니다." : "전문가만 접근할 수 있습니다."); setPageLoading(false); return; }
    setPageLoading(true); setActionError(null); setClient(null); setRequest(null);
    try {
      const { data: requestData, error: requestError } = await supabase.from('filing_requests').select<'*', FilingRequest>('*').eq('id', requestId).eq('assigned_professional_id', professionalProfile.id).single();
      if (requestError || !requestData) { throw new Error(requestError?.message || "의뢰 정보를 불러올 수 없거나 현재 전문가에게 배정된 의뢰가 아닙니다."); }
      setRequest(requestData);
      if (requestData.user_id) {
        try {
          const { data: profileData, error: profileError } = await supabase.from('user_profiles').select('id, email').eq('id', requestData.user_id).single();
          if (profileError || !profileData) { setClient({ id: requestData.user_id, email: '정보 조회 불가' }); }
          else { setClient({ id: profileData.id, email: profileData.email || '이메일 정보 없음' });}
        } catch (clientError) { setClient({ id: requestData.user_id, email: '정보 조회 오류' });}
      }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "데이터 로딩 중 알 수 없는 오류 발생";
        setActionError(message);
    } finally { setPageLoading(false); }
  }, [requestId, isProfessional, professionalProfile, isLoadingPro]);

  useEffect(() => { loadRequestAndClientData(); }, [loadRequestAndClientData]);

  const handleUpdateStatus = async (newStatus: 'processing' | 'completed'): Promise<void> => {
      if (!request?.id || !professionalProfile?.id) { toast({ title: "오류", description: "상태 업데이트 불가", variant: "destructive" }); return; }
      if ((newStatus === 'processing' && request.status !== 'assigned') || (newStatus === 'completed' && request.status !== 'processing')) { toast({ title: "알림", description: "잘못된 상태 변경 시도입니다.", variant: "default"}); return; }
      setIsUpdatingStatus(true);
      try {
          const { error: updateError } = await supabase.from('filing_requests').update({ status: newStatus }).eq('id', request.id).eq('assigned_professional_id', professionalProfile.id);
          if (updateError) throw updateError;
          setRequest(prev => prev ? { ...prev, status: newStatus } : null);
          toast({ title: "성공", description: `상태가 '${translateStatus(newStatus)}'(으)로 변경되었습니다.` });
      } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "상태 업데이트 중 오류 발생";
          toast({ title: "오류", description: message, variant: "destructive" });
      } finally { setIsUpdatingStatus(false); }
  };

  const handleFileDownload = async (file: AttachedFile): Promise<void> => {
    if (!file || !file.path) { toast({ title: "오류", description: "다운로드할 파일 정보가 유효하지 않습니다.", variant: "destructive"}); return; }
    toast({ title: "정보", description: `${file.name} 다운로드를 준비 중입니다...`, duration: 2000 });
    try {
      const { data, error } = await supabase.storage.from(FILING_ATTACHMENTS_BUCKET).createSignedUrl(file.path, 3600); // 1시간 유효
      if (error) throw error;
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else { throw new Error("Signed URL 생성 실패"); }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "파일 다운로드 중 오류 발생";
      toast({ title: "다운로드 오류", description: message, variant: "destructive" });
    }
  };
  
  const handleNewFilesStagedByPro = (selectedFiles: File[]): void => { setStagedFilesForNewUpload(selectedFiles); };

  const handleAddNewFilesByPro = async (): Promise<void> => {
    if (!request || !professionalProfile?.id || stagedFilesForNewUpload.length === 0) { return; }
    setIsUploadingNewFiles(true);
    const newlyUploadedFileInfos: AttachedFile[] = [];
    try {
      for (const file of stagedFilesForNewUpload) {
        const uploaderIdentifier = professionalProfile.id; // 전문가 식별자
        const fileNameWithTimestamp = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `${uploaderIdentifier}/${requestId}/${fileNameWithTimestamp}`;
        const { data, error: uploadError } = await supabase.storage.from(FILING_ATTACHMENTS_BUCKET).upload(filePath, file);
        if (uploadError) throw uploadError;
        if (data) { newlyUploadedFileInfos.push({ name: file.name, path: data.path, size: file.size, type: file.type, uploaded_at: new Date().toISOString() }); }
      }
      if (newlyUploadedFileInfos.length > 0) {
        const updatedFiles = [...(request.attached_files || []), ...newlyUploadedFileInfos];
        const { error: dbUpdateError } = await supabase.from('filing_requests').update({ attached_files: updatedFiles }).eq('id', request.id).eq('assigned_professional_id', professionalProfile.id);
        if (dbUpdateError) throw dbUpdateError;
        setRequest(prev => prev ? { ...prev, attached_files: updatedFiles } : null);
        toast({ title: "성공", description: "새 파일이 성공적으로 추가되었습니다." });
        setStagedFilesForNewUpload([]); setShowFileUpload(false); setClearFileUploadSignal(true);
      }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "새 파일 추가 중 오류 발생";
        toast({ title: "파일 추가 오류", description: message, variant: "destructive" });
    } finally { setIsUploadingNewFiles(false); }
  };

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

  if (pageLoading || isLoadingPro) { return <ProLayout><LoadingFallback message="의뢰 정보를 불러오는 중..." /></ProLayout>; }
  if (!isProfessional && !isLoadingPro) { return <Navigate to="/" replace />; }
  if (actionError || !request) {  return ( <ProLayout> <div className="max-w-2xl mx-auto space-y-4 p-4"> <p className="text-red-500 p-4 border border-destructive bg-destructive/10 rounded-md">{actionError || "의뢰 정보를 찾을 수 없습니다."}</p> <Button variant="outline" onClick={() => navigate('/pro/requests')}>목록으로</Button> </div> </ProLayout> ); }

  return (
    <ProLayout>
      <div className="space-y-6 max-w-3xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center"> <h1 className="text-3xl font-semibold">배정된 의뢰 상세 정보</h1> <Button variant="outline" onClick={() => navigate('/pro/requests')}>목록으로</Button> </div>
        <Card>
          <CardHeader> <CardTitle>{request.tax_year}년 귀속 종합소득세 신고 의뢰</CardTitle> <CardDescription> 의뢰인: {client?.email || '정보 없음'} | 접수일: {formatDate(request.created_at)} </CardDescription> </CardHeader>
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
            <div className="pt-6 border-t mt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold flex items-center"> <Paperclip className="mr-2 h-5 w-5 text-muted-foreground" /> 첨부 파일 </h3>
                    {(request.status === 'assigned' || request.status === 'processing') && !showFileUpload && (
                        <Button variant="outline" size="sm" onClick={() => {setShowFileUpload(true); setClearFileUploadSignal(false);}}> <PlusCircle className="mr-2 h-4 w-4"/> 파일 추가 (전문가) </Button>
                    )}
                </div>
                {showFileUpload && (
                  <Card className="mb-4 p-4 border-dashed bg-muted/20">
                    <CardHeader className="p-0 pb-3"><CardTitle className="text-md">새 파일 추가 (전문가용)</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <FileUpload
                        onFilesStaged={handleNewFilesStagedByPro}
                        clearStagedFilesSignal={clearFileUploadSignal}
                        onStagedFilesCleared={() => setClearFileUploadSignal(false)}
                      />
                      <div className="mt-4 flex justify-end space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => {setShowFileUpload(false); setStagedFilesForNewUpload([]); setClearFileUploadSignal(true);}}>취소</Button>
                        <Button size="sm" onClick={handleAddNewFilesByPro} disabled={stagedFilesForNewUpload.length === 0 || isUploadingNewFiles}>
                          {isUploadingNewFiles ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isUploadingNewFiles ? "업로드 중..." : `선택한 ${stagedFilesForNewUpload.length}개 파일 추가`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {(!request.attached_files || request.attached_files.length === 0) ? ( <p className="text-sm text-muted-foreground py-4 text-center">첨부된 파일이 없습니다.</p> )
                : ( <ul className="space-y-2"> {request.attached_files.map((file) => ( <li key={file.path} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"> <div className="flex items-center space-x-3 truncate flex-1 min-w-0"> <FileIcon className="h-6 w-6 text-blue-500 flex-shrink-0" /> <div className="truncate min-w-0"> <button type="button" onClick={() => handleFileDownload(file)} className="text-sm font-medium text-primary hover:underline cursor-pointer block text-left truncate" title={file.name}>{file.name}</button> <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB) - {formatDate(file.uploaded_at)}</span> </div> </div> <Button variant="outline" size="sm" onClick={() => handleFileDownload(file)}> <Download className="mr-1.5 h-4 w-4" /> 다운로드 </Button> </li> ))} </ul> )}
            </div>
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

export default ProRequestDetailPage;
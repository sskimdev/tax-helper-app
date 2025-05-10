// src/pages/FilingRequestDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest, AttachedFile } from '@/types/filingRequest';
import { formatDate } from '@/lib/utils';
import { FILING_ATTACHMENTS_BUCKET } from '@/config';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from '@/components/custom/FileUpload';
import { Download, Paperclip, Trash2, FileText as FileIcon, PlusCircle, Loader2 } from 'lucide-react';
import { LoadingFallback } from '@/components/custom/LoadingFallback';

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 items-start sm:gap-4">
        <dt className="text-sm font-medium text-muted-foreground sm:col-span-1">{label}</dt>
        <dd className="text-sm sm:col-span-2">{value || '-'}</dd>
    </div>
);

export default function FilingRequestDetailPage(): React.ReactNode {
  const { id: requestId } = useParams<{ id: string }>();
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [request, setRequest] = useState<FilingRequest | null>(null);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
  const [stagedFilesForNewUpload, setStagedFilesForNewUpload] = useState<File[]>([]);
  const [isUploadingNewFiles, setIsUploadingNewFiles] = useState<boolean>(false);
  const [clearFileUploadSignal, setClearFileUploadSignal] = useState<boolean>(false);

  const fetchRequestDetail = useCallback(async (): Promise<void> => {
    if (!requestId || !user) { setActionError("잘못된 접근이거나 로그인이 필요합니다."); setPageLoading(false); return; }
    setPageLoading(true); setActionError(null);
    try {
      const { data, error: dbError } = await supabase.from('filing_requests').select<'*', FilingRequest>('*').eq('id', requestId).eq('user_id', user.id).single();
      if (dbError || !data) { throw new Error(dbError?.message || "의뢰 정보를 찾을 수 없거나 권한이 없습니다."); }
      setRequest(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "데이터 로딩 중 알 수 없는 오류 발생";
      setActionError(message); setRequest(null);
    } finally { setPageLoading(false); }
  }, [requestId, user]);

  useEffect(() => { fetchRequestDetail(); }, [fetchRequestDetail]);

  const handleConfirmCancel = async (): Promise<void> => {
    if (!request?.id || !user?.id || request.status !== 'submitted') { toast({ title: "알림", description: "취소할 수 없는 상태의 의뢰입니다.", variant: "default" }); return; }
    setIsCancelling(true);
    try {
        const { error: updateError } = await supabase.from('filing_requests').update({ status: 'cancelled' }).eq('id', request.id).eq('user_id', user.id).eq('status', 'submitted');
        if (updateError) throw updateError;
        setRequest((prev) => prev ? { ...prev, status: 'cancelled' } : null);
        toast({ title: "성공", description: "의뢰가 성공적으로 취소되었습니다." });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "의뢰 취소 중 오류 발생";
        toast({ title: "오류", description: message, variant: "destructive" });
    } finally { setIsCancelling(false); }
  };

  const handleFileDownload = async (fileToDownload: AttachedFile): Promise<void> => {
    if (!fileToDownload?.path) { toast({ title: "오류", description: "다운로드할 파일 정보가 유효하지 않습니다.", variant: "destructive"}); return; }
    toast({ title: "정보", description: `${fileToDownload.name} 다운로드를 준비 중입니다...`, duration: 2000 });
    try {
      const { data, error } = await supabase.storage.from(FILING_ATTACHMENTS_BUCKET).createSignedUrl(fileToDownload.path, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        const link = document.createElement('a'); link.href = data.signedUrl; link.setAttribute('download', fileToDownload.name);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
      } else { throw new Error("Signed URL 생성 실패"); }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "파일 다운로드 중 오류 발생";
      toast({ title: "다운로드 오류", description: message, variant: "destructive" });
    }
  };

  const handleNewFilesStaged = (selectedFiles: File[]): void => {
    setStagedFilesForNewUpload(selectedFiles);
  };

  const handleAddNewFiles = async (): Promise<void> => {
    if (!request || !user || stagedFilesForNewUpload.length === 0) { toast({description: "추가할 파일이 없습니다.", variant: "default"}); return; }
    if (request.status !== 'submitted' && request.status !== 'assigned') { toast({description: "이 상태에서는 파일을 추가할 수 없습니다.", variant: "default"}); return; }
    setIsUploadingNewFiles(true);
    const newlyUploadedFileInfos: AttachedFile[] = [];
    let uploadFailed = false;
    try {
      toast({ title: "파일 업로드 시작", description: `${stagedFilesForNewUpload.length}개 파일 업로드 중...`});
      for (const file of stagedFilesForNewUpload) {
        const fileNameWithTimestamp = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `${user.id}/${requestId}/${fileNameWithTimestamp}`;
        const { data, error: uploadError } = await supabase.storage.from(FILING_ATTACHMENTS_BUCKET).upload(filePath, file);
        if (uploadError) { uploadFailed = true; throw uploadError; }
        if (data) { newlyUploadedFileInfos.push({ name: file.name, path: data.path, size: file.size, type: file.type, uploaded_at: new Date().toISOString() }); }
      }
      if (uploadFailed) { toast({title:"업로드 실패", description:"일부 파일 업로드에 실패했습니다.", variant:"destructive"}); return; }

      if (newlyUploadedFileInfos.length > 0) {
        const updatedFiles = [...(request.attached_files || []), ...newlyUploadedFileInfos];
        const { error: dbUpdateError } = await supabase.from('filing_requests').update({ attached_files: updatedFiles }).eq('id', request.id).eq('user_id', user.id);
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

  const handleFileDelete = async (fileToDelete: AttachedFile): Promise<void> => {
    if (!request || !user || !request.attached_files || !fileToDelete) { toast({title: "오류", description: "삭제할 파일 정보가 없습니다.", variant:"destructive"}); return; }
    if (!fileToDelete.path.startsWith(`${user.id}/`)) { toast({ title: "삭제 불가", description: "자신이 업로드한 파일만 삭제할 수 있습니다.", variant: "destructive"}); return; }
    if (request.status !== 'submitted') { toast({ title: "삭제 불가", description: "접수 완료 상태의 의뢰에서만 파일 삭제가 가능합니다.", variant: "default"}); return;}
    if (!confirm(`정말로 '${fileToDelete.name}' 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      const { error: storageError } = await supabase.storage.from(FILING_ATTACHMENTS_BUCKET).remove([fileToDelete.path]);
      if (storageError) throw storageError;
      const updatedFiles = request.attached_files.filter(f => f.path !== fileToDelete.path);
      const { error: dbError } = await supabase.from('filing_requests').update({ attached_files: updatedFiles.length > 0 ? updatedFiles : null }).eq('id', request.id).eq('user_id', user.id);
      if (dbError) throw dbError;
      setRequest(prev => prev ? { ...prev, attached_files: updatedFiles } : null);
      toast({ title: "삭제 완료", description: "파일이 성공적으로 삭제되었습니다." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "파일 삭제 중 오류 발생";
      toast({ title: "파일 삭제 오류", description: message, variant: "destructive" });
    }
  };

  const getStatusVariant = (status: FilingRequest['status']): "default" | "secondary" | "destructive" | "outline" => { switch (status) { case 'submitted': return 'secondary'; case 'assigned': return 'default'; case 'processing': return 'default'; case 'completed': return 'outline'; case 'cancelled': return 'destructive'; default: return 'secondary';} };
  const translateStatus = (status: FilingRequest['status']): string => { switch (status) { case 'submitted': return '접수 완료'; case 'assigned': return '전문가 배정됨'; case 'processing': return '신고 진행 중'; case 'completed': return '신고 완료'; case 'cancelled': return '취소됨'; default: return status; } };
  const formatIncome = (income?: number | null): string => { if (income === null || income === undefined) return '-'; try { return income.toLocaleString('ko-KR') + ' 원'; } catch { return '금액 표시 오류'; } };

  if (pageLoading) { return <LoadingFallback message="의뢰 정보를 불러오는 중입니다..." />; }
  if (!session) { return <Navigate to="/login" replace />; }
  if (actionError || !request) { return ( <div className="max-w-2xl mx-auto space-y-4 p-4"> <p className="text-red-500 p-4 border border-destructive bg-destructive/10 rounded-md">{actionError || "의뢰 내역을 찾을 수 없습니다."}</p> <Button variant="outline" onClick={() => navigate('/my-filings')}>목록으로</Button> </div> ); }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center"> <h1 className="text-3xl font-semibold">의뢰 상세 정보</h1> <Button variant="outline" onClick={() => navigate('/my-filings')}>목록으로</Button> </div>
      <Card>
        <CardHeader> <CardTitle>{request.tax_year}년 귀속 종합소득세 신고 의뢰</CardTitle> <CardDescription>제출일: {formatDate(request.created_at)}</CardDescription> </CardHeader>
        <CardContent className="space-y-6">
          <dl className="space-y-4"> <DetailItem label="의뢰 상태" value={<Badge variant={getStatusVariant(request.status)}>{translateStatus(request.status)}</Badge>} /> <Separator /> <DetailItem label="신고 대상 연도" value={`${request.tax_year}년`} /> <DetailItem label="주요 소득 종류" value={request.income_type} /> <DetailItem label="연간 총 수입 금액" value={formatIncome(request.estimated_income)} /> <Separator /> <DetailItem label="추가 요청 사항" value={request.details || '없음'} /> </dl>
          <div className="pt-6 border-t mt-6">
            <div className="flex justify-between items-center mb-4"> <h3 className="text-lg font-semibold flex items-center"> <Paperclip className="mr-2 h-5 w-5 text-muted-foreground" /> 첨부 파일 </h3> {(request.status === 'submitted' || request.status === 'assigned') && !showFileUpload && ( <Button variant="outline" size="sm" onClick={() => {setShowFileUpload(true); setClearFileUploadSignal(false);}}> <PlusCircle className="mr-2 h-4 w-4"/> 파일 추가 </Button> )} </div>
            {showFileUpload && (
              <Card className="mb-4 p-4 border-dashed bg-muted/20">
                <CardHeader className="p-0 pb-3"><CardTitle className="text-md">새 파일 추가</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <FileUpload onFilesStaged={handleNewFilesStaged} clearStagedFilesSignal={clearFileUploadSignal} onStagedFilesCleared={() => setClearFileUploadSignal(false)} />
                  <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => {setShowFileUpload(false); setStagedFilesForNewUpload([]); setClearFileUploadSignal(true);}}>취소</Button>
                    <Button size="sm" onClick={handleAddNewFiles} disabled={stagedFilesForNewUpload.length === 0 || isUploadingNewFiles}> {isUploadingNewFiles ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {isUploadingNewFiles ? "업로드 중..." : `선택한 ${stagedFilesForNewUpload.length}개 파일 추가`} </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {(!request.attached_files || request.attached_files.length === 0) ? ( <p className="text-sm text-muted-foreground py-4 text-center">첨부된 파일이 없습니다.</p> ) : (
              <ul className="space-y-2"> {request.attached_files.map((file) => ( <li key={file.path} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"> <div className="flex items-center space-x-3 truncate flex-1 min-w-0"> <FileIcon className="h-6 w-6 text-blue-500 flex-shrink-0" /> <div className="truncate min-w-0"> <button type="button" onClick={() => handleFileDownload(file)} className="text-sm font-medium text-primary hover:underline cursor-pointer block text-left truncate" title={file.name}>{file.name}</button> <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB) - {formatDate(file.uploaded_at)}</span> </div> </div> <div className="flex items-center space-x-1 ml-2 flex-shrink-0"> <Button variant="outline" size="sm" onClick={() => handleFileDownload(file)} title="다운로드">
  <span><Download className="mr-1.5 h-4 w-4" /> 다운로드</span>
</Button> {file.path.startsWith(`${user?.id}/`) && request.status === 'submitted' && ( <AlertDialog> <AlertDialogTrigger asChild> 
  <Button variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" title="삭제">
    <span><Trash2 className="h-4 w-4" /></span>
  </Button> 
</AlertDialogTrigger> <AlertDialogContent> <AlertDialogHeader><AlertDialogTitle>파일 삭제 확인</AlertDialogTitle><AlertDialogDescription>정말로 '{file.name}' 파일을 삭제하시겠습니까?</AlertDialogDescription></AlertDialogHeader> <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => handleFileDelete(file)} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction></AlertDialogFooter> </AlertDialogContent> </AlertDialog> )} </div> </li> ))} </ul>
            )}
          </div>
          {request.status === 'submitted' && ( <div className="pt-6 border-t mt-6 flex flex-wrap gap-2"> <Link to={`/my-filings/${request.id}/edit`}> <Button variant="outline" disabled={isCancelling}>의뢰 수정하기</Button> </Link> <AlertDialog> <AlertDialogTrigger asChild> 
            <Button variant="destructive" disabled={isCancelling}>
              {isCancelling ? <span>취소 처리 중...</span> : <span>의뢰 취소하기</span>}
            </Button> 
          </AlertDialogTrigger> <AlertDialogContent> <AlertDialogHeader><AlertDialogTitle>의뢰 취소 확인</AlertDialogTitle><AlertDialogDescription>정말로 이 신고 의뢰를 취소하시겠습니까?</AlertDialogDescription></AlertDialogHeader> <AlertDialogFooter><AlertDialogCancel disabled={isCancelling}>닫기</AlertDialogCancel><AlertDialogAction onClick={handleConfirmCancel} disabled={isCancelling}>확인 (취소)</AlertDialogAction></AlertDialogFooter> </AlertDialogContent> </AlertDialog> </div> )}
          {request.status === 'cancelled' && ( <p className="text-sm text-destructive pt-4 border-t mt-6">이 의뢰는 사용자에 의해 취소되었습니다.</p> )}
          {['assigned', 'processing', 'completed'].includes(request.status) && !showFileUpload && ( <p className="text-sm text-muted-foreground pt-4 border-t mt-6">이미 전문가에게 배정되었거나 처리가 시작/완료된 의뢰는 수정하거나 취소할 수 없습니다. (파일 추가는 '배정 완료' 상태까지 가능)</p> )}
        </CardContent>
      </Card>
    </div>
  );
}
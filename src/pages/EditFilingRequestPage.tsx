// src/pages/EditFilingRequestPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest, FilingRequestFormData, AttachedFile } from '@/types/filingRequest';
import { filingRequestSchema, INCOME_TYPES } from '@/types/filingRequest';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
// Alert 관련 import 제거
import { FileUpload } from '@/components/custom/FileUpload';
import { FileText, XCircle } from 'lucide-react';
import { FILING_ATTACHMENTS_BUCKET } from '@/config';

export function EditFilingRequestPage(): React.ReactNode {
  const { id: requestId } = useParams<{ id: string }>();
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<FilingRequest | null>(null);
  const [currentManagedFiles, setCurrentManagedFiles] = useState<AttachedFile[]>([]);
  const [stagedNewFiles, setStagedNewFiles] = useState<File[]>([]);


  const form = useForm<FilingRequestFormData>({
    resolver: zodResolver(filingRequestSchema),
    defaultValues: { /* ... */ }
  });

  useEffect(() => {
    async function loadRequestData(): Promise<void> {
      if (!requestId || !user) { setPageError("..."); setPageLoading(false); return; }
      setPageLoading(true); setPageError(null);
      try {
        const { data: fetchedData, error: dbError } = await supabase.from('filing_requests').select<'*', FilingRequest>('*').eq('id', requestId).eq('user_id', user.id).single();
        if (dbError || !fetchedData) { throw new Error("..."); }
        if (fetchedData.status !== 'submitted') { setPageError("..."); setInitialData(fetchedData); setPageLoading(false); return; }
        setInitialData(fetchedData);
        setCurrentManagedFiles(fetchedData.attached_files || []);
        form.reset({ /* ... */ });
      } catch (err: unknown) { /* ... */ }
      finally { setPageLoading(false); }
    }
    if (requestId && user) { loadRequestData(); }
    else { setPageError(requestId ? "..." : "..."); setPageLoading(false); }
  }, [requestId, user, form]);

  const handleNewFilesSelected = (selectedFiles: File[]): void => {
    setStagedNewFiles(selectedFiles);
  };

  const removeFileFromManagedList = (filePathToRemove: string): void => {
    if (!confirm("...")) return;
    setCurrentManagedFiles(prevFiles => prevFiles.filter(file => file.path !== filePathToRemove));
    const fileName = filePathToRemove.split('/').pop();
    if (fileName) { setStagedNewFiles(prevFiles => prevFiles.filter(file => file.name !== fileName)); }
    toast({ title: "알림", description: "파일이 첨부 목록에서 제거되었습니다. 변경 사항을 저장해주세요."});
  };

  const onSubmit: SubmitHandler<FilingRequestFormData> = async (values) => {
     if (!requestId || !user || !initialData || initialData.status !== 'submitted') { /*...*/ return; }
    setIsSubmitting(true);
    const newlyUploadedFileInfos: AttachedFile[] = [];

    if (stagedNewFiles.length > 0) {
        toast({ title: "새 파일 업로드 시작", description: `${stagedNewFiles.length}개의 새 파일을 업로드합니다.`});
        for (const file of stagedNewFiles) {
            // fileNameWithTimestamp 변수 제거
            const filePath = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`; // 직접 할당
            try {
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from(FILING_ATTACHMENTS_BUCKET)
                    .upload(filePath, file, { cacheControl: '3600', upsert: false });
                if (uploadError) throw uploadError;
                if (uploadData) {
                    newlyUploadedFileInfos.push({
                        name: file.name, path: uploadData.path, size: file.size,
                        type: file.type, uploaded_at: new Date().toISOString(),
                    });
                }
            } catch (error: any) {
                 toast({ title: "파일 업로드 실패", description: `${file.name} 업로드 중 오류: ${error.message}`, variant: "destructive" });
                 setIsSubmitting(false); return;
            }
        }
    }

    const filesToDeleteFromStorage: AttachedFile[] = (initialData.attached_files || []).filter(
        initialFile => !currentManagedFiles.some(currentFile => currentFile.path === initialFile.path)
    );

    if (filesToDeleteFromStorage.length > 0) {
        const pathsToRemove = filesToDeleteFromStorage.map(f => f.path);
        const { error: storageError } = await supabase.storage.from(FILING_ATTACHMENTS_BUCKET).remove(pathsToRemove);
        if (storageError) { /* ... 오류 처리 ... */ }
    }

    // finalCurrentFiles 변수 제거, finalAttachedFiles 로직 수정
    const finalAttachedFiles = [
        ...currentManagedFiles,
        ...newlyUploadedFileInfos
    ].filter( // 중복 제거 로직 (newlyUploadedFileInfos가 currentManagedFiles에 이미 있을 수 있으므로)
        (file, index, self) => index === self.findIndex((f) => f.path === file.path)
    );

    try {
      const updateData: Partial<FilingRequest> = {
        tax_year: values.tax_year, income_type: values.income_type,
        estimated_income: values.estimated_income && !isNaN(values.estimated_income) ? values.estimated_income : null,
        details: values.details ?? null,
        attached_files: finalAttachedFiles.length > 0 ? finalAttachedFiles : null,
      };
      const { error: updateError } = await supabase.from('filing_requests').update(updateData).eq('id', requestId).eq('user_id', user.id).eq('status', 'submitted');
      if (updateError) throw updateError;
      toast({ title: "성공", description: "의뢰 내용이 성공적으로 수정되었습니다." });
      navigate(`/my-filings/${requestId}`);
    } catch (err: unknown) { /* ... 오류 처리 ... */ }
    finally { setIsSubmitting(false); }
  };

  if (pageLoading) { return <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">의뢰 정보 로딩 중...</div>; }
  if (!session) { return <Navigate to="/login" replace />; }
  if (pageError && initialData && initialData.status !== 'submitted') {
    return ( <div className="max-w-2xl mx-auto space-y-4 p-4"> <p className="text-red-500 p-4 border border-destructive bg-destructive/10 rounded-md">{pageError}</p> <Button variant="outline" onClick={() => navigate(`/my-filings/${requestId || ''}`)}>상세 정보로 돌아가기</Button> </div> );
  }
  if (pageError || (!initialData && !pageLoading)) {
    return ( <div className="max-w-2xl mx-auto space-y-4 p-4"> <p className="text-red-500 p-4 border border-destructive bg-destructive/10 rounded-md">{pageError || "데이터를 불러올 수 없습니다."}</p> <Button variant="outline" onClick={() => navigate('/my-filings')}>목록으로</Button> </div> );
  }
  if (!initialData) { return <div className="max-w-2xl mx-auto p-4"><p>데이터를 표시할 수 없습니다.</p></div>; }

  const currentYear = new Date().getFullYear();
  const taxYearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader> <CardTitle>의뢰 내용 수정</CardTitle> <CardDescription>{initialData.tax_year}년 귀속 종합소득세 신고 의뢰 내용을 수정합니다.</CardDescription> </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="tax_year" render={({ field }) => ( <FormItem> <FormLabel>신고 대상 연도 *</FormLabel> <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)} > <FormControl><SelectTrigger><SelectValue placeholder="연도 선택" /></SelectTrigger></FormControl> <SelectContent>{taxYearOptions.map(year => (<SelectItem key={year} value={String(year)}>{year}년 귀속</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="income_type" render={({ field }) => ( <FormItem> <FormLabel>주요 소득 종류 *</FormLabel> <Select onValueChange={field.onChange} value={field.value} > <FormControl><SelectTrigger><SelectValue placeholder="소득 종류 선택" /></SelectTrigger></FormControl> <SelectContent>{INCOME_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent> </Select> <FormDescription>대표 소득 하나를 선택해주세요.</FormDescription> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="estimated_income" render={({ field }) => ( <FormItem> <FormLabel>연간 총 수입 금액 (선택)</FormLabel> <FormControl><Input type="number" placeholder="예: 30000000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl> <FormDescription>세전 수입을 대략적으로 입력해주세요.</FormDescription> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem> <FormLabel>추가 요청 사항 (선택)</FormLabel> <FormControl><Textarea placeholder="추가 요청사항 입력..." className="resize-none h-24" {...field} value={field.value ?? ''} /></FormControl> <FormDescription>최대 1000자</FormDescription> <FormMessage /> </FormItem> )}/>
            <div className="space-y-2"> <FileUpload onFilesStaged={handleNewFilesSelected} /> </div>
            {(currentManagedFiles.length > 0 || stagedNewFiles.length > 0) && (
                <div className="space-y-2 pt-2 border-t"> <h4 className="text-sm font-medium">첨부 파일 목록 (수정 중):</h4> <ul className="list-none space-y-1 text-sm">
                    {currentManagedFiles.map((file) => ( <li key={file.path} className="flex items-center justify-between p-2 border rounded-md bg-muted/50"> <div className="flex items-center space-x-2 truncate"> <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" /> <span className="truncate" title={file.name}>{file.name}</span> <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span> </div> <Button variant="ghost" size="icon" onClick={() => removeFileFromManagedList(file.path)} title="목록에서 제거"> <XCircle className="h-4 w-4 text-destructive" /> </Button> </li> ))}
                    {stagedNewFiles.filter(sf => !currentManagedFiles.some(cf => cf.name === sf.name && cf.size === sf.size)).map((file, index) => ( // index 사용
                        <li key={`new-${file.name}-${index}-${file.lastModified}`} className="flex items-center justify-between p-2 border rounded-md bg-blue-50"> {/* key에 index, lastModified 추가 */}
                            <div className="flex items-center space-x-2 truncate"> <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" /> <span className="truncate" title={file.name}>{file.name} (새 파일)</span> <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span> </div>
                            <Button variant="ghost" size="icon" onClick={() => setStagedNewFiles(prev => prev.filter(f => f.name !== file.name))} title="선택 취소"> <XCircle className="h-4 w-4 text-blue-700" /> </Button>
                        </li>
                    ))}
                </ul> </div>
            )}
            <div className="flex justify-end space-x-2 pt-4"> <Button type="button" variant="outline" onClick={() => navigate(`/my-filings/${requestId}`)} disabled={isSubmitting}>취소</Button> <Button type="submit" disabled={isSubmitting || pageLoading}> {isSubmitting ? '저장 중...' : '수정 내용 저장'} </Button> </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default EditFilingRequestPage;
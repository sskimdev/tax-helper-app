// src/pages/RequestFilingPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from '@/lib/supabaseClient';
import { filingRequestSchema, type FilingRequestFormData, INCOME_TYPES, type AttachedFile, type FilingRequest } from '@/types/filingRequest';
import type { Professional } from '@/types/professional';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react"; // 필요한 아이콘만 import
import { FileUpload } from '@/components/custom/FileUpload';
import { FILING_ATTACHMENTS_BUCKET } from '@/config';

export function RequestFilingPage(): React.ReactNode {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [designatedExpert, setDesignatedExpert] = useState<Professional | null>(null);
  const [expertLoading, setExpertLoading] = useState<boolean>(false);
  const [stagedFilesForUpload, setStagedFilesForUpload] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const profId: string | null = searchParams.get('professional_id');
    if (profId) setProfessionalId(profId);
  }, [searchParams]);

  useEffect(() => {
    async function fetchDesignatedExpert(): Promise<void> {
      if (!professionalId) {
        setDesignatedExpert(null);
        return;
      }
      setExpertLoading(true);
      try {
        const { data, error } = await supabase
          .from('professionals')
          .select<'*', Professional>('*')
          .eq('id', professionalId)
          .single();
        if (error) {
            if (error.code === 'PGRST116') {
                 console.warn(`지정된 전문가 ID(${professionalId})에 해당하는 전문가를 찾을 수 없습니다.`);
                 toast({ title: "알림", description: "지정된 전문가 정보를 찾을 수 없습니다. 일반 의뢰로 진행됩니다.", variant: "default"});
                 setProfessionalId(null);
            } else { throw error; }
        }
        setDesignatedExpert(data);
      } catch (err: any) {
        console.error("지정 전문가 정보 조회 실패:", err);
        toast({ title: "오류", description: "지정된 전문가 정보를 불러오는데 실패했습니다.", variant: "destructive" });
        setDesignatedExpert(null);
        setProfessionalId(null);
      } finally {
        setExpertLoading(false);
      }
    }
    fetchDesignatedExpert();
  }, [professionalId, toast]);

  const currentYear = new Date().getFullYear();
  const form = useForm<FilingRequestFormData>({
    resolver: zodResolver(filingRequestSchema),
    defaultValues: { tax_year: currentYear - 1, income_type: undefined, estimated_income: undefined, details: "" },
  });

  const handleFilesSelectedFromComponent = (selectedFiles: File[]): void => {
    setStagedFilesForUpload(selectedFiles);
  };

  const onSubmit: SubmitHandler<FilingRequestFormData> = async (values) => {
    if (!user) { toast({ title: "오류", description: "로그인이 필요합니다.", variant: "destructive" }); return; }
    setIsSubmitting(true);
    setUploadProgress({});
    const uploadedFileInfos: AttachedFile[] = [];

    if (stagedFilesForUpload.length > 0) {
        toast({ title: "파일 업로드 시작", description: `${stagedFilesForUpload.length}개의 파일을 업로드합니다.`});
        for (const file of stagedFilesForUpload) {
            const filePath = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`; // 직접 경로 생성
            setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
            
            // 파일 크기가 2MB 이상인 경우 청크 업로드 방식 사용
            const MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
            const MAX_RETRIES = 3;
            
            if (file.size > MAX_CHUNK_SIZE) {
                try {
                    // 큰 파일은 청크 단위로 나누어 업로드
                    const totalChunks = Math.ceil(file.size / MAX_CHUNK_SIZE);
                    let uploadedChunks = 0;
                    let uploadedFileInfo = null;
                    
                    for (let i = 0; i < totalChunks; i++) {
                        const start = i * MAX_CHUNK_SIZE;
                        const end = Math.min(file.size, start + MAX_CHUNK_SIZE);
                        const chunk = file.slice(start, end);
                        
                        let retries = 0;
                        let success = false;
                        
                        while (retries < MAX_RETRIES && !success) {
                            try {
                                let options = {
                                    cacheControl: '3600',
                                    upsert: false
                                };
                                
                                // 첫 번째 청크가 아닌 경우 이어서 업로드
                                if (i > 0) {
                                    options = {
                                        ...options,
                                        upsert: true
                                    };
                                }
                                
                                const { data, error } = await supabase.storage
                                    .from(FILING_ATTACHMENTS_BUCKET)
                                    .upload(filePath, chunk, options);
                                    
                                if (error) throw error;
                                uploadedChunks++;
                                uploadedFileInfo = data;
                                success = true;
                                
                                // 진행률 업데이트
                                const progress = Math.round((uploadedChunks / totalChunks) * 100);
                                setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
                            } catch (err) {
                                retries++;
                                console.warn(`청크 업로드 실패 (${i+1}/${totalChunks}), 재시도 ${retries}/${MAX_RETRIES}`, err);
                                if (retries >= MAX_RETRIES) throw err;
                                // 잠시 대기 후 재시도
                                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                            }
                        }
                    }
                    
                    if (uploadedFileInfo) {
                        uploadedFileInfos.push({
                            name: file.name, path: uploadedFileInfo.path, size: file.size,
                            type: file.type, uploaded_at: new Date().toISOString(),
                        });
                        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                    }
                } catch (error: any) {
                    console.error(`Error uploading ${file.name}:`, error);
                    toast({ title: "업로드 실패", description: `${file.name} 파일 업로드 중 오류: ${error.message}`, variant: "destructive" });
                    setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
                    setIsSubmitting(false); return;
                }
            } else {
                // 작은 파일은 기존 방식으로 업로드
                let retries = 0;
                while (retries < MAX_RETRIES) {
                    try {
                        const { data, error: uploadError } = await supabase.storage
                        .from(FILING_ATTACHMENTS_BUCKET)
                        .upload(filePath, file, { cacheControl: '3600', upsert: false });
                        
                        if (uploadError) throw uploadError;
                        
                        if (data) {
                            uploadedFileInfos.push({
                                name: file.name, path: data.path, size: file.size,
                                type: file.type, uploaded_at: new Date().toISOString(),
                            });
                            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                        }
                        break; // 성공하면 반복문 종료
                    } catch (error: any) {
                        retries++;
                        console.warn(`파일 업로드 실패, 재시도 ${retries}/${MAX_RETRIES}`, error);
                        if (retries >= MAX_RETRIES) {
                            console.error(`Error uploading ${file.name} after ${MAX_RETRIES} attempts:`, error);
                            toast({ title: "업로드 실패", description: `${file.name} 파일 업로드 중 오류: ${error.message}`, variant: "destructive" });
                            setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
                            setIsSubmitting(false); return;
                        }
                        // 잠시 대기 후 재시도
                        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                    }
                }
            }
        }
        if (uploadedFileInfos.length !== stagedFilesForUpload.length) {
            toast({ title: "일부 파일 업로드 실패", variant: "destructive"});
            setIsSubmitting(false); return;
        }
        toast({ title: "파일 업로드 완료", description: `${uploadedFileInfos.length}개의 파일 업로드 완료.`});
    }

    try {
      const submissionData: Omit<FilingRequest, 'id' | 'created_at'> = {
        user_id: user.id,
        tax_year: values.tax_year,
        income_type: values.income_type,
        estimated_income: values.estimated_income && !isNaN(values.estimated_income) ? values.estimated_income : null,
        details: values.details ?? null,
        status: 'submitted',
        assigned_professional_id: professionalId || null,
        attached_files: uploadedFileInfos.length > 0 ? uploadedFileInfos : null,
        fee: null,
        payment_status: 'pending',
      };

      const { data: insertedData, error: dbError } = await supabase
        .from('filing_requests')
        .insert([submissionData])
        .select();

      if (dbError) throw dbError;

      if (insertedData) console.log("신고 의뢰 저장 성공:", insertedData);
      toast({ title: "의뢰 완료", description: "종합소득세 신고 의뢰가 성공적으로 접수되었습니다."});
      navigate('/my-filings');
    } catch (error: any) {
      console.error("신고 의뢰 저장 실패:", error);
      toast({ title: "오류 발생", description: `의뢰 접수 중 오류: ${error.message}`, variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) return <Navigate to="/login" replace />;
  const taxYearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>종합소득세 신고 의뢰하기</CardTitle>
        {expertLoading ? ( <CardDescription>지정된 전문가 정보를 불러오는 중...</CardDescription> )
         : designatedExpert ? ( <Alert className="mt-2"> <Terminal className="h-4 w-4" /> <AlertTitle>지정 전문가</AlertTitle> <AlertDescription> {designatedExpert.name} 세무사님에게 직접 의뢰합니다. </AlertDescription> </Alert> )
         : ( <CardDescription>아래 정보를 입력해주시면 최적의 전문가를 찾아 매칭해 드립니다.</CardDescription> )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="tax_year" render={({ field }) => (
                <FormItem> <FormLabel>신고 대상 연도 *</FormLabel> <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value !== undefined ? String(field.value) : ""}> <FormControl><SelectTrigger><SelectValue placeholder="연도 선택" /></SelectTrigger></FormControl> <SelectContent>{taxYearOptions.map(year => (<SelectItem key={year} value={String(year)}>{year}년 귀속</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem>
            )} />
            <FormField control={form.control} name="income_type" render={({ field }) => (
                <FormItem> <FormLabel>주요 소득 종류 *</FormLabel> <Select onValueChange={field.onChange} value={field.value || ""}> <FormControl><SelectTrigger><SelectValue placeholder="소득 종류 선택" /></SelectTrigger></FormControl> <SelectContent>{INCOME_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent> </Select> <FormDescription>대표 소득 하나를 선택해주세요.</FormDescription> <FormMessage /> </FormItem>
            )} />
            <FormField control={form.control} name="estimated_income" render={({ field }) => (
                <FormItem> <FormLabel>연간 총 수입 금액 (선택)</FormLabel> <FormControl><Input type="number" placeholder="예: 30000000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl> <FormDescription>세전 수입을 대략적으로 입력해주세요.</FormDescription> <FormMessage /> </FormItem>
            )} />
            <FormField control={form.control} name="details" render={({ field }) => (
                <FormItem> <FormLabel>추가 요청 사항 (선택)</FormLabel> <FormControl><Textarea placeholder="예) 근로소득 외에 부동산 임대소득..." className="resize-none h-24" {...field} value={field.value ?? ''} /></FormControl> <FormDescription>전문가에게 전달하고 싶은 내용을 자유롭게 작성해주세요.</FormDescription> <FormMessage /> </FormItem>
            )} />

<div className="space-y-2">
               <FileUpload onFilesSelected={handleFilesSelectedFromComponent} />
               {isSubmitting && stagedFilesForUpload.length > 0 && Object.keys(uploadProgress).length > 0 && (
                   <div className="space-y-1 mt-2 p-2 border rounded-md">
                       <p className="text-sm font-medium">파일 업로드 진행 상황:</p>
                       {stagedFilesForUpload.map(file => (
                           uploadProgress[file.name] !== undefined && (
                               <div key={file.name} className="text-xs flex justify-between items-center">
                                   <span className="truncate max-w-[80%]">{file.name}</span>
                                   {uploadProgress[file.name] === -1 ? <span className="text-red-500 font-semibold">오류</span> : <span className="text-blue-600 font-semibold">{uploadProgress[file.name]}%</span> }
                               </div>
                           )
                       ))}
                   </div>
               )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || expertLoading}>
              {isSubmitting ? '제출 중...' : (designatedExpert ? `${designatedExpert.name} 세무사에게 의뢰 제출` : '신고 의뢰 제출하기')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
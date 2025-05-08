// src/pages/EditFilingRequestPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form"; // SubmitHandler는 type으로 import
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from '@/lib/supabaseClient';
// 타입을 명시적으로 가져옵니다.
import type { FilingRequest, FilingRequestFormData } from '@/types/filingRequest';
import { filingRequestSchema, INCOME_TYPES } from '@/types/filingRequest'; // 스키마, 상수 가져오기

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function EditFilingRequestPage() {
  // useParams 타입 명시
  const { id: requestId } = useParams<{ id: string }>();
  // useAuth 반환 타입 명시
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // 상태 타입 명시
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // 원본 데이터 타입 명시
  const [initialData, setInitialData] = useState<FilingRequest | null>(null);

  // useForm 제네릭 타입 명시
  const form = useForm<FilingRequestFormData>({
    resolver: zodResolver(filingRequestSchema),
    defaultValues: {
        // 초기값은 로딩 후 설정하므로 여기서 비워두거나 기본값 설정
        tax_year: new Date().getFullYear() - 1,
        income_type: undefined,
        estimated_income: undefined,
        details: '',
    }
  });

  // 데이터 로딩 및 폼 초기화 Effect
  useEffect(() => {
    async function loadRequestData(): Promise<void> {
      if (!requestId || !user) {
        setError("잘못된 접근이거나 로그인이 필요합니다.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('filing_requests')
          .select<'*', FilingRequest>('*') // 타입 제네릭 명시
          .eq('id', requestId)
          .eq('user_id', user.id) // 본인 데이터 확인
          .single();

        if (dbError || !data) { // !data 조건 추가
          let errMsg = "의뢰 정보를 불러올 수 없거나 권한이 없습니다.";
          if (dbError?.code === 'PGRST116') {
              errMsg = "해당 의뢰 내역을 찾을 수 없습니다.";
          } else if (dbError) {
              errMsg = `데이터 로딩 오류: ${dbError.message}`;
          }
          throw new Error(errMsg);
        }

        if (data.status !== 'submitted') {
           setError("이미 처리 중이거나 완료/취소된 의뢰는 수정할 수 없습니다.");
           setLoading(false);
           setInitialData(data); // 에러 발생 전 원본 데이터라도 저장
           return;
        }

        setInitialData(data);

        // 폼 값 초기화
        form.reset({
          tax_year: data.tax_year,
          income_type: data.income_type, // 타입 일치 확인됨
          estimated_income: data.estimated_income ?? undefined,
          details: data.details ?? "",
        });

      } catch (err: unknown) { // unknown 사용 및 타입 가드
        console.error("Error loading request data:", err);
        let message = "데이터 로딩 중 알 수 없는 오류 발생";
        if (err instanceof Error) {
            message = err.message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadRequestData();
  }, [requestId, user, form, navigate]); // 의존성 배열 확인

  // 폼 제출 핸들러 (Update 로직)
  // SubmitHandler<FilingRequestFormData> 타입 사용
  const onSubmit: SubmitHandler<FilingRequestFormData> = async (values) => {
     if (!requestId || !user || !initialData || initialData.status !== 'submitted') {
         toast({ title: "오류", description: "수정할 수 없는 상태입니다.", variant: "destructive" });
         return;
     }

    setIsSubmitting(true);
    try {
        // 업데이트할 데이터 정의 (타입 명시적 캐스팅 지양)
        const updateData: Partial<FilingRequest> = { // Partial 사용
            tax_year: values.tax_year,
            income_type: values.income_type,
            estimated_income: values.estimated_income && !isNaN(values.estimated_income) ? values.estimated_income : null,
            details: values.details ?? null // 빈 문자열도 null로 저장하고 싶다면
        };

        const { error: updateError } = await supabase
            .from('filing_requests')
            .update(updateData)
            .eq('id', requestId)
            .eq('user_id', user.id)
            .eq('status', 'submitted'); // 상태 확인

        if (updateError) throw updateError;

        toast({ title: "성공", description: "의뢰 내용이 성공적으로 수정되었습니다." });
        navigate(`/my-filings/${requestId}`); // 수정 후 상세 페이지로 이동

    } catch (err: unknown) { // unknown 사용
        console.error("Error updating request:", err);
        let message = "수정 중 알 수 없는 오류 발생";
        if (err instanceof Error) {
            message = err.message;
        }
        toast({ title: "오류", description: message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- 로딩, 에러, 비로그인 상태 UI ---
  if (loading) {
      return <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">의뢰 정보 로딩 중...</div>;
  }
   if (!session) {
       return <Navigate to="/login" replace />;
   }
   // 수정 불가 상태 메시지 추가
   if (error && initialData?.status !== 'submitted') {
        return (
            <div className="max-w-2xl mx-auto space-y-4 p-4">
                <Alert variant="destructive">
                    <AlertTitle>수정 불가</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button variant="outline" onClick={() => navigate(`/my-filings/${requestId || ''}`)}>상세 정보로 돌아가기</Button>
            </div>
        );
   }
   // 일반 에러 (데이터 로딩 실패 등)
   if (error || !initialData) {
      return (
          <div className="max-w-2xl mx-auto space-y-4 p-4">
              <Alert variant="destructive">
                  <AlertTitle>오류</AlertTitle>
                  <AlertDescription>{error || "데이터를 불러올 수 없습니다."}</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => navigate('/my-filings')}>목록으로</Button>
          </div>
      );
   }
   // ---------------------------------------

  const currentYear = new Date().getFullYear();
  const taxYearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>의뢰 내용 수정</CardTitle>
        <CardDescription>{initialData.tax_year}년 귀속 종합소득세 신고 의뢰 내용을 수정합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 신고 연도 */}
            <FormField
              control={form.control}
              name="tax_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>신고 대상 연도 *</FormLabel>
                  <Select
                     onValueChange={(value) => field.onChange(Number(value))}
                     value={String(field.value)} // field.value는 number일 수 있음
                     >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="신고하려는 연도를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taxYearOptions.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}년 귀속</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 소득 종류 */}
            <FormField
              control={form.control}
              name="income_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>주요 소득 종류 *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value} // field.value는 string | undefined
                    >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="해당 연도의 주요 소득 종류를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INCOME_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   <FormDescription>
                    가장 대표적인 소득 하나를 선택해주세요. 복수 소득은 아래 요청사항에 기재해주세요.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 예상 수입 */}
             <FormField
              control={form.control}
              name="estimated_income"
              render={({ field }) => (
                 <FormItem>
                    <FormLabel>연간 총 수입 금액 (선택)</FormLabel>
                    <FormControl>
                       <Input
                          type="number"
                          placeholder="예: 30000000 (원 단위 숫자만 입력)"
                          {...field}
                          // field 값이 undefined/null일 때 빈 문자열로 표시
                          value={field.value ?? ''}
                          // Zod의 coerce:true로 인해 number로 자동 변환 시도됨
                          // 수동 변환 필요시 아래처럼
                          onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                          />
                    </FormControl>
                    <FormDescription>
                      세전 수입 금액을 대략적으로 입력해주시면 예상 수수료 안내에 도움이 됩니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
              )}
            />

            {/* 추가 요청 사항 */}
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>추가 요청 사항 (선택)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="예) 근로소득 외에 부동산 임대소득(주택)이 있습니다. / 작년에 처음 사업을 시작했습니다."
                      className="resize-none"
                      {...field}
                      value={field.value ?? ''} // field 값이 null일 경우 빈 문자열
                    />
                  </FormControl>
                   <FormDescription>
                    전문가에게 전달하고 싶은 내용을 자유롭게 작성해주세요. (최대 1000자)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
                 <Button type="button" variant="outline" onClick={() => navigate(`/my-filings/${requestId}`)} disabled={isSubmitting}>
                    취소
                 </Button>
                 <Button type="submit" disabled={isSubmitting || loading}>
                     {isSubmitting ? '저장 중...' : '수정 내용 저장'}
                 </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
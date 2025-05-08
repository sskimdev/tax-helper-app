// src/pages/RequestFilingPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'; // useSearchParams 추가
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from '@/lib/supabaseClient';
import { filingRequestSchema, INCOME_TYPES } from '@/types/filingRequest';
import type { FilingRequestFormData } from '@/types/filingRequest';
import type { Professional } from '@/types/professional'; // 전문가 타입 import

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Alert 컴포넌트 추가
import { Terminal } from "lucide-react"; // 아이콘 추가

// Alert 컴포넌트 추가 필요
// npx shadcn@latest add alert

export function RequestFilingPage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams(); // URL 쿼리 파라미터 읽기

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null); // 지정된 전문가 ID 상태
  const [designatedExpert, setDesignatedExpert] = useState<Professional | null>(null); // 지정된 전문가 정보 상태
  const [expertLoading, setExpertLoading] = useState<boolean>(false); // 전문가 정보 로딩 상태

  // 컴포넌트 마운트 시 쿼리 파라미터 확인
  useEffect(() => {
    const profId: string | null = searchParams.get('professional_id');
    if (profId) {
      setProfessionalId(profId);
    }
  }, [searchParams]);

  // professionalId가 있으면 해당 전문가 정보 가져오기
  useEffect(() => {
    async function fetchDesignatedExpert() {
      if (!professionalId) return;

      setExpertLoading(true);
      try {
        const { data, error } = await supabase
          .from('professionals')
          .select('*')
          .eq('id', professionalId)
          .single();

        if (error) throw error;
        setDesignatedExpert(data);
      } catch (error: any) {
        console.error("지정 전문가 정보 조회 실패:", error);
        toast({
          title: "오류",
          description: "지정된 전문가 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
        // ID는 있지만 정보 조회를 실패하면 ID를 초기화하여 일반 의뢰로 진행하도록 할 수 있음
        // setProfessionalId(null);
      } finally {
        setExpertLoading(false);
      }
    }
    fetchDesignatedExpert();
  }, [professionalId, toast]); // professionalId 변경 시 실행

  // 1. 폼 초기화 (react-hook-form)
  const currentYear = new Date().getFullYear();
  const form = useForm<FilingRequestFormData>({
    resolver: zodResolver(filingRequestSchema),
    defaultValues: {
      tax_year: currentYear - 1,
      income_type: undefined,
      estimated_income: undefined,
      details: "",
    },
  });

  // 2. 제출 핸들러 정의
  async function onSubmit(values: FilingRequestFormData): Promise<void> {
    if (!user) {
      toast({
        title: "오류",
        description: "로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const processedValues: any = { // 타입을 좀 더 유연하게 처리 (assigned_professional_id 추가 위해)
        ...values,
        estimated_income: values.estimated_income && !isNaN(values.estimated_income) ? values.estimated_income : null,
        user_id: user.id,
        status: 'submitted',
      };

      // 지정된 전문가 ID가 있으면 함께 저장
      if (professionalId) {
        processedValues.assigned_professional_id = professionalId;
        // 전문가가 지정되면 상태를 'assigned'로 바로 변경할 수도 있음 (정책에 따라 결정)
        // processedValues.status = 'assigned';
      }

      const { data, error } = await supabase
        .from('filing_requests')
        .insert([processedValues])
        .select();

      if (error) throw error;

      console.log("신고 의뢰 저장 성공:", data);
      toast({
        title: "의뢰 완료",
        description: "종합소득세 신고 의뢰가 성공적으로 접수되었습니다.",
      });
      navigate('/my-filings');

    } catch (error: any) {
      console.error("신고 의뢰 저장 실패:", error);
      toast({
        title: "오류 발생",
        description: `의뢰 접수 중 오류가 발생했습니다: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const taxYearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>종합소득세 신고 의뢰하기</CardTitle>
        {/* 지정된 전문가 정보 표시 */}
        {expertLoading ? (
            <CardDescription>지정된 전문가 정보를 불러오는 중...</CardDescription>
        ) : designatedExpert ? (
             <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>지정 전문가</AlertTitle>
                <AlertDescription>
                 {designatedExpert.name} 세무사님에게 직접 의뢰합니다.
                </AlertDescription>
            </Alert>
        ) : (
             <CardDescription>아래 정보를 입력해주시면 최적의 전문가를 찾아 매칭해 드립니다.</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 신고 연도 */}
            <FormField
              control={form.control}
              name="tax_year"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>신고 대상 연도 *</FormLabel>
                  <Select onValueChange={(value: string) => field.onChange(Number(value))} defaultValue={String(field.value)}>
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
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>주요 소득 종류 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="해당 연도의 주요 소득 종류를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INCOME_TYPES.map((type: string) => (
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
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>연간 총 수입 금액 (선택)</FormLabel>
                  <FormControl>
                     <Input
                        type="number"
                        placeholder="예: 30000000 (원 단위 숫자만 입력)"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        value={field.value === undefined || field.value === null ? '' : String(field.value)}
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
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>추가 요청 사항 (선택)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="예) 근로소득 외에 부동산 임대소득(주택)이 있습니다. / 작년에 처음 사업을 시작했습니다."
                      className="resize-none"
                      {...field} // value, onChange 등을 포함
                    />
                  </FormControl>
                   <FormDescription>
                    전문가에게 전달하고 싶은 내용을 자유롭게 작성해주세요. (최대 1000자)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting || expertLoading}>
              {isSubmitting ? '제출 중...' : (designatedExpert ? `${designatedExpert.name} 세무사에게 의뢰 제출` : '신고 의뢰 제출하기')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
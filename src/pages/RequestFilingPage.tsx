// src/pages/RequestFilingPage.tsx
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from '@/lib/supabaseClient';
import { filingRequestSchema, INCOME_TYPES } from '@/types/filingRequest';
import type { FilingRequestFormData } from '@/types/filingRequest';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast"; // 수정된 import 경로

export function RequestFilingPage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast(); // useToast 훅 사용

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
  async function onSubmit(values: FilingRequestFormData) {
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
      const processedValues = {
        ...values,
        estimated_income: values.estimated_income && !isNaN(values.estimated_income) ? values.estimated_income : null,
        user_id: user.id,
        status: 'submitted',
      };

      const { data, error } = await supabase
        .from('filing_requests')
        .insert([processedValues])
        .select();

      if (error) {
        throw error;
      }

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
        <CardDescription>아래 정보를 입력해주시면 전문가 매칭을 도와드립니다.</CardDescription>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '제출 중...' : '신고 의뢰 제출하기'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
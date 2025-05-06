// src/pages/ExpertsPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Professional } from '@/types/professional'; // 타입으로 가져오도록 수정

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
// import { Skeleton } from "@/components/ui/skeleton"; // Skeleton 사용 시

export function ExpertsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfessionals() {
      setLoading(true);
      setError(null);
      try {
        // Supabase에서 '인증된(is_verified=true)' 전문가 데이터 가져오기
        // RLS 정책에 의해 로그인한 사용자만 접근 가능
        const { data, error: dbError } = await supabase
          .from('professionals')
          .select('*')
          .eq('is_verified', true) // 인증된 전문가만 필터링
          .order('created_at', { ascending: false }); // 필요시 정렬 기준 변경

        if (dbError) {
          throw dbError;
        }

        setProfessionals(data || []);
      } catch (err: any) {
        console.error("Error fetching professionals:", err);
        setError(`전문가 목록을 불러오는 중 오류가 발생했습니다: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchProfessionals();
  }, []);

  // 로딩 상태 표시
  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">세무 전문가 찾기</h1>
        <p>데이터를 불러오는 중입니다...</p>
        {/* Skeleton 그리드 예시
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[80%]" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-[100px]" />
              </CardFooter>
            </Card>
          ))}
        </div>
         */}
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">세무 전문가 찾기</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">세무 전문가 찾기</h1>
      {/* TODO: 검색 및 필터링 기능 추가 위치 */}

      {professionals.length === 0 ? (
        <p>현재 활동 중인 전문가가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map((pro) => (
            <Card key={pro.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4 pb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={pro.profile_image_url || undefined} alt={pro.name} />
                  <AvatarFallback>{pro.name.substring(0, 1)}</AvatarFallback> {/* 이름 첫 글자 */}
                </Avatar>
                <div>
                  <CardTitle>{pro.name} 세무사</CardTitle>
                  {pro.location && (
                    <CardDescription>{pro.location}</CardDescription>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                {/* 전문 분야 */}
                {pro.specialties && pro.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pro.specialties.map((spec) => (
                      <Badge key={spec} variant="secondary">{spec}</Badge>
                    ))}
                  </div>
                )}
                {/* 간단 소개 */}
                <p className="text-sm text-muted-foreground line-clamp-3"> {/* 3줄 초과 시 ... 표시 */}
                  {pro.introduction || "소개가 없습니다."}
                </p>
              </CardContent>
              <CardFooter>
                {/* TODO: 전문가 상세 페이지 또는 상담 신청 버튼 */}
                <Button variant="outline" className="w-full">프로필 상세보기</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
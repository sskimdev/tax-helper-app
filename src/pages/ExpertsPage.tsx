// src/pages/ExpertsPage.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Link import 추가
import { supabase } from '@/lib/supabaseClient';
import type { Professional } from '@/types/professional'; // 타입 import 확인 (user가 interface -> type으로 변경함)
import { useDebounce } from '@/hooks/useDebounce'; // Debounce 훅 import

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator'; // Separator 추가

// 검색 가능한 전문 분야 목록 (실제 서비스에서는 DB에서 가져오거나 관리자 페이지에서 설정)
// 예시: filingRequest.ts의 INCOME_TYPES와 유사하게 정의하거나 별도 관리
const ALL_SPECIALTIES = [
  '사업소득(간편장부)',
  '사업소득(복식부기)',
  '프리랜서(3.3%)',
  '근로소득',
  '양도소득',
  '상속/증여',
  '주택임대소득',
  '해외소득',
  '기타소득',
] as const;

export function ExpertsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색 및 필터링 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  // 검색어 디바운싱 (500ms)
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    async function fetchProfessionals() {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('professionals')
          .select('*')
          .eq('is_verified', true); // 인증된 전문가만

        // 1. 검색어 필터링 (이름, 지역, 소개 - OR 조건)
        if (debouncedSearchTerm) {
          const searchTermQuery = `or(name.ilike.%${debouncedSearchTerm}%,location.ilike.%${debouncedSearchTerm}%,introduction.ilike.%${debouncedSearchTerm}%)`;
          query = query.or(searchTermQuery);
          // 참고: Full Text Search를 사용하면 더 효율적입니다.
          // 예: .textSearch('fts', `'${debouncedSearchTerm}'`)
        }

        // 2. 전문 분야 필터링 (선택된 모든 분야를 포함하는 전문가 - overlaps 연산자 사용)
        if (selectedSpecialties.length > 0) {
          // '{ "사업소득", "양도소득" }' 형태의 문자열로 변환
          const specialtiesArrayString = `{${selectedSpecialties.map(s => `"${s}"`).join(',')}}`;
          query = query.overlaps('specialties', specialtiesArrayString); // specialties 컬럼(text[])과 선택된 배열이 교집합이 있는지 확인
        }

        // 정렬
        query = query.order('created_at', { ascending: false });

        // 쿼리 실행
        const { data, error: dbError } = await query;

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
  }, [debouncedSearchTerm, selectedSpecialties]); // 디바운스된 검색어 또는 선택된 전문분야가 변경될 때마다 실행

  // 전문 분야 체크박스 핸들러
  const handleSpecialtyChange = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty) // 이미 있으면 제거
        : [...prev, specialty] // 없으면 추가
    );
  };

  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSpecialties([]);
  };

  // 로딩 상태 표시
  if (loading && professionals.length === 0) { // 초기 로딩 시에만 전체 스켈레톤 표시
      return (
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold">세무 전문가 찾기</h1>
            {/* 검색/필터 영역 스켈레톤 */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-grow h-10 bg-gray-200 rounded animate-pulse"></div> {/* 검색창 스켈레톤 */}
                <div className="flex items-center space-x-2">
                    <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div> {/* 초기화 버튼 스켈레톤 */}
                </div>
            </div>
             {/* 필터 영역 스켈레톤 */}
             <div className="h-20 bg-gray-200 rounded animate-pulse mb-6"></div>
            {/* 카드 목록 스켈레톤 */}
            <p>전문가 목록을 불러오는 중입니다...</p>
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

      {/* 검색 및 초기화 */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          type="search"
          placeholder="전문가 이름, 지역, 소개 내용으로 검색..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <Button variant="outline" onClick={handleResetFilters}>
          초기화
        </Button>
      </div>

      {/* 전문 분야 필터링 */}
      <div className="space-y-2">
          <Label className="text-sm font-medium">전문 분야</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
              {ALL_SPECIALTIES.map((specialty) => (
                  <div key={specialty} className="flex items-center space-x-2">
                      <Checkbox
                          id={`specialty-${specialty}`}
                          checked={selectedSpecialties.includes(specialty)}
                          onCheckedChange={() => handleSpecialtyChange(specialty)}
                      />
                      <Label
                          htmlFor={`specialty-${specialty}`}
                          className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                          {specialty}
                      </Label>
                  </div>
              ))}
          </div>
      </div>

      <Separator />

      {/* 전문가 목록 표시 */}
      {loading ? (
          <p>검색 결과를 불러오는 중...</p> /* 필터링 중 로딩 */
      ) : professionals.length === 0 ? (
        <p>검색 조건에 맞는 전문가가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map((pro) => (
            <Card key={pro.id} className="flex flex-col">
              {/* Card 내용은 이전과 동일 */}
              <CardHeader className="flex flex-row items-center gap-4 pb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={pro.profile_image_url || undefined} alt={pro.name} />
                  <AvatarFallback>{pro.name.substring(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{pro.name} 세무사</CardTitle>
                  {pro.location && (
                    <CardDescription>{pro.location}</CardDescription>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                {pro.specialties && pro.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pro.specialties.map((spec: string) => (
                      <Badge key={spec} variant="secondary">{spec}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {pro.introduction || "소개가 없습니다."}
                </p>
              </CardContent>
              <CardFooter>
                 {/* 상세 보기 버튼을 Link로 감싸기 */}
                 <Link to={`/experts/${pro.id}`} className="w-full">
                  <Button variant="outline" className="w-full">프로필 상세보기</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
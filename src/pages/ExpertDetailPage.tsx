// src/pages/ExpertDetailPage.tsx
import { useState, useEffect } from 'react';
// useParams, useNavigate 는 react-router-dom 에서 가져옵니다. Link는 제거합니다.
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import type { Professional } from '@/types/professional'; // 타입 사용 확인

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { Mail, Star } from 'lucide-react'; // 아이콘 추가 (lucide-react는 이미 설치됨)

// 상세 정보 항목 표시 Helper 컴포넌트 (FilingRequestDetailPage와 유사)
/* 
const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{label}</h3>
      <div className="text-base">{value || '-'}</div>
    </div>
  );
*/

export function ExpertDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate(); // useNavigate 훅 사용
    const [expert, setExpert] = useState<Professional | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExpertDetail() {
      if (!id) {
        setError("잘못된 접근입니다.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Supabase에서 특정 id의 professionals 데이터 가져오기
        // is_verified = true 조건과 RLS 정책에 의해 인증된 사용자만 조회 가능
        const { data, error: dbError } = await supabase
          .from('professionals')
          .select('*')
          .eq('id', id)
          .eq('is_verified', true) // 인증된 전문가만 조회
          .single(); // 단일 행만 가져옴

        if (dbError) {
           if (dbError.code === 'PGRST116') { // 결과 없음 (Not Found)
             setError("해당 전문가 정보를 찾을 수 없습니다.");
          } else {
              throw dbError;
          }
          setExpert(null);
        } else if (data) {
          setExpert(data);
        } else {
           setError("해당 전문가 정보를 찾을 수 없습니다.");
           setExpert(null);
        }

      } catch (err: any) {
        console.error("Error fetching expert detail:", err);
        setError(`전문가 정보를 불러오는 중 오류가 발생했습니다: ${err.message}`);
        setExpert(null);
      } finally {
        setLoading(false);
      }
    }

    fetchExpertDetail();
  }, [id]); // id가 변경되면 다시 불러옴

  // 로딩 상태 표시
  if (loading) {
     return (
         <div className="space-y-4 max-w-3xl mx-auto p-4">
             <p>전문가 정보를 불러오는 중입니다...</p>
             {/* TODO: 상세 페이지 스켈레톤 UI */}
         </div>
     );
  }

  // 에러 또는 전문가 정보 없음 상태 표시
  if (error || !expert) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto p-4">
         <div className="flex justify-between items-center mb-4">
             <h1 className="text-2xl font-semibold">오류</h1>
              <Button variant="outline" onClick={() => navigate('/experts')}>목록으로</Button>
         </div>
        <p className="text-red-500">{error || "전문가 정보를 찾을 수 없습니다."}</p>
      </div>
    );
  }

  // 간단한 별점 표시 (예시)
  const renderRating = (rating?: number | null) => {
      const score = Math.round(rating || 0);
      if (score <= 0) return <span className="text-muted-foreground">평점 없음</span>;
      return (
          <div className="flex items-center">
              {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} className={i < score ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
              ))}
              <span className="ml-2 text-sm font-medium">{rating?.toFixed(1)}</span>
          </div>
      );
  }

  // 의뢰하기 버튼 클릭 핸들러
  const handleRequestClick = (): void => {
    if (expert?.id) {
        // professional_id 쿼리 파라미터를 포함하여 /request-filing 으로 이동
        navigate(`/request-filing?professional_id=${expert.id}`);
    } else {
        // 혹시 모를 에러 처리 (expert id가 없는 경우)
        console.error("전문가 ID가 없어 의뢰 페이지로 이동할 수 없습니다.");
        // 사용자에게 알림 표시 (toast 등)
    }
};

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4 md:p-6">
      {/* 뒤로가기 버튼 */}
      <Button variant="outline" onClick={() => navigate('/experts')} className="mb-4">
         &larr; 전문가 목록으로
      </Button>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="h-24 w-24 border">
            <AvatarImage src={expert.profile_image_url || undefined} alt={expert.name} />
            <AvatarFallback className="text-3xl">{expert.name.substring(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-2xl">{expert.name} 세무사</CardTitle>
            {expert.location && (
              <CardDescription>{expert.location}</CardDescription>
            )}
            {/* 평점 및 리뷰 수 */}
            <div className="flex items-center gap-4 pt-1">
                {renderRating(expert.rating)}
                <span className="text-sm text-muted-foreground">({expert.review_count || 0}개 리뷰)</span>
            </div>
          </div>
          {/* 연락처 정보 (이메일 등) */}
          {expert.email && (
            <a href={`mailto:${expert.email}`} className="mt-2 md:mt-0">
                <Button variant="outline" size="sm">
                    <Mail className="mr-2 h-4 w-4" /> 이메일 문의
                </Button>
            </a>
          )}
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* 전문 분야 */}
          {expert.specialties && expert.specialties.length > 0 && (
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">전문 분야</h3>
                <div className="flex flex-wrap gap-2">
                    {expert.specialties.map((spec: string) => (
                    <Badge key={spec} variant="secondary">{spec}</Badge>
                    ))}
                </div>
            </div>
          )}

          <Separator />

          {/* 소개 */}
          <div>
              <h3 className="text-lg font-semibold mb-2">소개</h3>
              <p className="text-base whitespace-pre-wrap">{expert.introduction || "소개 정보가 없습니다."}</p>
          </div>

          {/* TODO: 경력, 학력, 수수료 정보 등 추가 섹션 */}
          {/* 예시: */}
          <Separator />
          <div>
              <h3 className="text-lg font-semibold mb-2">수수료 정보</h3>
              <p className="text-sm text-muted-foreground">기본 수수료: ...</p>
              <p className="text-sm text-muted-foreground">추가 수수료 조건: ...</p>
          </div>
          {/* 예시: */}

          <Separator />

          {/* 상담 신청 버튼 */}
          <div className="text-center pt-4">
                {/* Link 대신 Button 사용 및 onClick 핸들러 연결 */}
                <Button size="lg" onClick={handleRequestClick}>
                    이 전문가에게 신고 의뢰하기
                </Button>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
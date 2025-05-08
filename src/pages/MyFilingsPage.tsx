// src/pages/MyFilingsPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest } from '@/types/filingRequest'; // 타입으로 가져오도록 수정
import { formatDate } from '@/lib/utils'; // 날짜 포맷 함수 import

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
// import { Skeleton } from "@/components/ui/skeleton"; // Skeleton 사용 시

export function MyFilingsPage() {
  const { session, user } = useAuth();
  const [filingRequests, setFilingRequests] = useState<FilingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFilingRequests() {
      if (!user) {
        setLoading(false);
        setError("로그인이 필요합니다.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Supabase에서 현재 사용자의 filing_requests 데이터 가져오기
        // RLS 정책 덕분에 자동으로 user_id가 일치하는 데이터만 반환됨
        const { data, error: dbError } = await supabase
          .from('filing_requests')
          .select('*') // 모든 컬럼 선택
          .order('created_at', { ascending: false }); // 최신순 정렬

        if (dbError) {
          throw dbError;
        }

        setFilingRequests(data || []); // 데이터가 null일 경우 빈 배열로 처리
      } catch (err: any) {
        console.error("Error fetching filing requests:", err);
        setError(`의뢰 내역을 불러오는 중 오류가 발생했습니다: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchFilingRequests();
  }, [user]); // user 정보가 변경될 때마다(로그인/로그아웃 시) 다시 불러옴

  // 로딩 상태 표시
  if (loading) {
    // 간단한 텍스트 로딩 표시 (Skeleton 컴포넌트로 대체 가능)
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">나의 신고 의뢰 내역</h1>
            <p>데이터를 불러오는 중입니다...</p>
            {/* Skeleton 예시
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-[80%]" />
            </div>
            */}
        </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
        <div>
            <h1 className="text-2xl font-semibold">나의 신고 의뢰 내역</h1>
            <p className="text-red-500">{error}</p>
        </div>
    );
  }

  // 로그인하지 않은 경우 (AuthContext 로딩 완료 후 확인)
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 상태(status)에 따른 Badge 스타일 함수
  const getStatusVariant = (status: FilingRequest['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'submitted': return 'secondary';
      case 'assigned': return 'default'; // primary 스타일
      case 'processing': return 'default';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  // 상태(status) 한글 변환 함수 (선택 사항)
  const translateStatus = (status: FilingRequest['status']): string => {
    switch (status) {
      case 'submitted': return '접수 완료';
      case 'assigned': return '전문가 배정됨';
      case 'processing': return '신고 진행 중';
      case 'completed': return '신고 완료';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">나의 신고 의뢰 내역</h1>
          <Link to="/request-filing">
              <Button>새 의뢰 작성하기</Button>
          </Link>
      </div>

      {filingRequests.length === 0 ? (
        <p>아직 제출한 신고 의뢰 내역이 없습니다.</p>
      ) : (
        <Table>
          <TableCaption>최근 의뢰 내역입니다.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">신고 연도</TableHead>
              <TableHead>소득 종류</TableHead>
              <TableHead>제출일</TableHead>
              <TableHead className="text-right">상태</TableHead>
              {/* <TableHead className="text-right">관리</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filingRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.tax_year}년</TableCell>
                <TableCell>{request.income_type}</TableCell>
                <TableCell>{formatDate(request.created_at)}</TableCell>
                <TableCell className="text-right">
                    <Badge variant={getStatusVariant(request.status)}>
                        {translateStatus(request.status)}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    {/* 상세 보기 버튼/링크 추가 */}
                    <Link to={`/my-filings/${request.id}`}>
                        <Button variant="outline" size="sm">상세보기</Button>
                    </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// MyFilingsPage 컴포넌트를 export (기존 임시 컴포넌트와 충돌 방지 위해 App.tsx에서만 임시 컴포넌트 정의 유지)
// 만약 App.tsx에서 임시 컴포넌트 정의를 제거했다면 아래 export 주석 해제
// export default MyFilingsPage;
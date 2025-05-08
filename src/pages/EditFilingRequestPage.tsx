// src/pages/EditFilingRequestPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/lib/supabaseClient';
import type { FilingRequest } from '@/types/filingRequest';

export function EditFilingRequestPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [filingRequest, setFilingRequest] = useState<FilingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 세션 확인
    if (!session) {
      navigate('/login');
      return;
    }

    // 의뢰 데이터 불러오기
    async function fetchFilingRequest() {
      try {
        if (!id) return;

        const { data, error: fetchError } = await supabase
          .from('filing_requests')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        // 소유권 확인 (다른 유저의 의뢰는 편집 불가)
        if (data.user_id !== session?.user?.id) {
          setError('이 의뢰를 편집할 권한이 없습니다.');
          return;
        }

        setFilingRequest(data as FilingRequest);
      } catch (err) {
        console.error('의뢰 불러오기 실패:', err);
        setError('의뢰를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchFilingRequest();
  }, [id, session, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">의뢰 편집 중...</h1>
          <p>의뢰 정보를 불러오는 중입니다.</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !filingRequest) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">오류 발생</h1>
          <p className="text-red-500">{error || '의뢰를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/my-filings')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            내 의뢰 목록으로 돌아가기
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">의뢰 편집</h1>
        <p>이 페이지는 구현 중입니다. 곧 서비스 예정입니다.</p>
        <pre className="bg-gray-100 p-4 rounded mt-4">
          {JSON.stringify(filingRequest, null, 2)}
        </pre>
        <button
          onClick={() => navigate(`/my-filings/${id}`)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          의뢰 상세 보기로 돌아가기
        </button>
      </div>
    </MainLayout>
  );
}
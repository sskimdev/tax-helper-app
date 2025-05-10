// src/pages/ProDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProLayout } from '@/components/layout/ProLayout';
import { useProAuth } from '@/hooks/useProAuth';
import { supabase } from '@/lib/supabaseClient';
import { formatDate } from '@/lib/utils';
import type { FilingRequest } from '@/types/filingRequest';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, PieChart, User, Calendar } from 'lucide-react';
import { LoadingFallback } from '@/components/custom/LoadingFallback';

export default function ProDashboardPage(): React.ReactNode {
  const { isProfessional, professionalProfile, isLoadingPro } = useProAuth();
  const navigate = useNavigate();
  
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [processingRequests, setProcessingRequests] = useState<number>(0);
  const [completedRequests, setCompletedRequests] = useState<number>(0);
  const [recentRequests, setRecentRequests] = useState<FilingRequest[]>([]);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 대시보드 데이터 로드
  useEffect(() => {
    async function loadDashboardData() {
      if (isLoadingPro) return;
      if (!isProfessional || !professionalProfile?.id) {
        setError("전문가 계정으로만 접근할 수 있습니다.");
        setPageLoading(false);
        return;
      }

      setPageLoading(true);
      try {
        // 요청 상태별 개수 조회
        const { data: assigned, error: assignedError } = await supabase
          .from('filing_requests')
          .select('id')
          .eq('assigned_professional_id', professionalProfile.id)
          .eq('status', 'assigned');
          
        const { data: processing, error: processingError } = await supabase
          .from('filing_requests')
          .select('id')
          .eq('assigned_professional_id', professionalProfile.id)
          .eq('status', 'processing');
          
        const { data: completed, error: completedError } = await supabase
          .from('filing_requests')
          .select('id')
          .eq('assigned_professional_id', professionalProfile.id)
          .eq('status', 'completed');
          
        // 최근 의뢰 5개 로드
        const { data: recent, error: recentError } = await supabase
          .from('filing_requests')
          .select('*')
          .eq('assigned_professional_id', professionalProfile.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (assignedError || processingError || completedError || recentError) {
          throw new Error("데이터 로딩 중 오류가 발생했습니다.");
        }
        
        setPendingRequests(assigned?.length || 0);
        setProcessingRequests(processing?.length || 0);
        setCompletedRequests(completed?.length || 0);
        setRecentRequests(recent || []);
        
      } catch (err) {
        console.error("대시보드 데이터 로딩 오류:", err);
        setError("대시보드 데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setPageLoading(false);
      }
    }
    
    loadDashboardData();
  }, [isProfessional, professionalProfile, isLoadingPro]);

  // 상태별 의뢰 페이지로 이동
  const navigateToRequests = (status?: string) => {
    if (status) {
      navigate(`/pro/requests?status=${status}`);
    } else {
      navigate('/pro/requests');
    }
  };

  if (pageLoading || isLoadingPro) {
    return <ProLayout><LoadingFallback message="대시보드 정보를 불러오는 중..." /></ProLayout>;
  }

  if (error) {
    return (
      <ProLayout>
        <div className="max-w-2xl mx-auto space-y-4 p-4">
          <p className="text-red-500 p-4 border border-destructive bg-destructive/10 rounded-md">
            {error}
          </p>
        </div>
      </ProLayout>
    );
  }

  return (
    <ProLayout>
      <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">대시보드</h1>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">배정 완료</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests}건</div>
              <p className="text-xs text-muted-foreground">처리 대기 중인 의뢰</p>
              <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => navigateToRequests('assigned')}>
                상세 보기
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">처리 중</CardTitle>
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processingRequests}건</div>
              <p className="text-xs text-muted-foreground">현재 진행 중인 의뢰</p>
              <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => navigateToRequests('processing')}>
                상세 보기
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">완료</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <BarChart className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedRequests}건</div>
              <p className="text-xs text-muted-foreground">처리 완료된 의뢰</p>
              <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => navigateToRequests('completed')}>
                상세 보기
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>최근 배정된 의뢰</CardTitle>
            <CardDescription>가장 최근에 배정된 의뢰 {recentRequests.length}건</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">배정된 의뢰가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {recentRequests.map((req) => (
                  <li key={req.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <h3 className="font-medium">{req.tax_year}년 귀속 종합소득세 신고</h3>
                      <p className="text-sm text-muted-foreground">접수일: {formatDate(req.created_at)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/pro/requests/${req.id}`)}>
                      자세히 보기
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            
            {recentRequests.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={() => navigateToRequests()}>
                  모든 의뢰 보기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProLayout>
  );
}
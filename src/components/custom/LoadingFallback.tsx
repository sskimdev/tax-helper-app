// src/components/custom/LoadingFallback.tsx (예시)
import React from 'react'; // React import 추가
import { Skeleton } from "@/components/ui/skeleton"; // 또는 다른 로딩 UI

export function LoadingFallback({ message = "페이지 로딩 중..." }: { message?: string }): React.ReactNode {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      <Skeleton className="h-12 w-12 rounded-full mb-4" /> {/* 예시 스켈레톤 */}
      <Skeleton className="h-4 w-[250px] mb-2" />
      <Skeleton className="h-4 w-[200px]" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}
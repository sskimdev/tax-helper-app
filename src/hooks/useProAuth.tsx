import React, { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // 기존 AuthContext 훅 사용
import { supabase } from '@/lib/supabaseClient';
import type { Professional } from '@/types/professional'; // 전문가 타입 import

// 전문가 인증 상태 및 프로필 정보를 위한 컨텍스트 타입 정의
interface ProAuthContextType {
  isProfessional: boolean; // 전문가 여부
  professionalProfile: Professional | null; // 전문가 프로필 정보
  isLoadingPro: boolean; // 전문가 정보 로딩 상태
}

// 컨텍스트 생성 (undefined로 초기화하여 Provider 외부 사용 방지)
const ProAuthContext = createContext<ProAuthContextType | undefined>(undefined);

// ProAuthProvider 컴포넌트 정의
export const ProAuthProvider = ({ children }: { children: ReactNode }): React.ReactElement => {
  // useAuth 훅에서 필요한 상태 가져오기
  const { user, isLoading: isAuthLoading, session } = useAuth();
  // 전문가 관련 상태 정의
  const [isProfessional, setIsProfessional] = useState<boolean>(false);
  const [professionalProfile, setProfessionalProfile] = useState<Professional | null>(null);
  const [isLoadingPro, setIsLoadingPro] = useState<boolean>(true);

  useEffect(() => {
    async function checkProfessionalStatus(): Promise<void> {
      // 사용자 정보 로딩 중이거나 로그인하지 않았다면 처리 중단
      if (isAuthLoading || !user || !session) {
        setIsProfessional(false);
        setProfessionalProfile(null);
        // isAuthLoading이 false가 된 후에야 최종 로딩 상태 결정 가능
        if (!isAuthLoading) {
             setIsLoadingPro(false);
        }
        return;
      }

      // 이미 로딩이 완료되었다면 다시 실행하지 않음 (user, session 변경 시에만)
      // (이 부분은 로직 최적화에 따라 다를 수 있음, 여기서는 user/session 변경 시 항상 재확인)
      setIsLoadingPro(true);
      try {
        // professionals 테이블에서 현재 user.id와 일치하고 is_verified가 true인 전문가 조회
        const { data, error } = await supabase
          .from('professionals')
          .select<'*', Professional>('*') // 타입 명시
          .eq('user_id', user.id)
          .eq('is_verified', true) // 인증된 전문가만
          .maybeSingle(); // 결과가 없어도 에러 아님 (null 반환)

        if (error) {
          console.error("Error fetching professional profile:", error);
          // throw error; // 에러를 던지는 대신 상태 초기화 및 로깅
          setIsProfessional(false);
          setProfessionalProfile(null);
        } else if (data) {
          // 전문가 정보가 있으면 상태 업데이트
          setIsProfessional(true);
          setProfessionalProfile(data);
        } else {
          // 전문가 정보가 없으면 상태 초기화
          setIsProfessional(false);
          setProfessionalProfile(null);
        }
      } catch (err) {
        // try 블록 내에서 발생한 다른 에러 처리
        console.error("Unexpected error checking professional status:", err);
        setIsProfessional(false);
        setProfessionalProfile(null);
      } finally {
        setIsLoadingPro(false); // 전문가 정보 조회/처리 완료
      }
    }

    // isAuthLoading이 false일 때만 전문가 상태 확인 실행
    if (!isAuthLoading) {
        checkProfessionalStatus();
    }
    // 의존성 배열에 user, isAuthLoading, session 포함
  }, [user, isAuthLoading, session]);

  // 컨텍스트 값 구성
  const value: ProAuthContextType = {
    isProfessional,
    professionalProfile,
    isLoadingPro,
  };

  // 컨텍스트 Provider 반환
  return <ProAuthContext.Provider value={value}>{children}</ProAuthContext.Provider>;
};

// useProAuth 훅 정의
export const useProAuth = (): ProAuthContextType => {
  const context = useContext(ProAuthContext);
  if (context === undefined) {
    // Provider 외부에서 사용 시 에러 발생
    throw new Error('useProAuth must be used within a ProAuthProvider');
  }
  return context;
}; 
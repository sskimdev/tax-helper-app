import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface ProfessionalProfile {
  id: string;
  name?: string;
  email?: string;
  professional_license_number?: string;
  specializations?: string[];
  profile_image_url?: string;
  created_at?: string;
}

interface ProAuthState {
  isProfessional: boolean;
  isLoadingPro: boolean;
  professionalProfile: ProfessionalProfile | null;
  error: Error | null;
}

export function useProAuth(): ProAuthState {
  const { session } = useAuth();
  const [isProfessional, setIsProfessional] = useState<boolean>(false);
  const [isLoadingPro, setIsLoadingPro] = useState<boolean>(true);
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalProfile | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function checkProfessionalStatus() {
      if (!session?.user) {
        setIsLoadingPro(false);
        setIsProfessional(false);
        setProfessionalProfile(null);
        return;
      }

      try {
        // 전문가 테이블에서 현재 유저의 프로필 조회
        const { data, error: fetchError } = await supabase
          .from('professionals')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (fetchError) {
          // 레코드가 없는 경우 -> 전문가 아님
          if (fetchError.code === 'PGRST116') {
            setIsProfessional(false);
            setProfessionalProfile(null);
          } else {
            // 다른 에러 케이스
            throw fetchError;
          }
        } else if (data) {
          // 전문가 프로필 있음
          setIsProfessional(true);
          setProfessionalProfile(data as ProfessionalProfile);
        }
      } catch (err) {
        console.error('전문가 상태 확인 중 오류 발생:', err);
        setError(err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.'));
        setIsProfessional(false);
        setProfessionalProfile(null);
      } finally {
        setIsLoadingPro(false);
      }
    }

    checkProfessionalStatus();
  }, [session]);

  return {
    isProfessional,
    isLoadingPro,
    professionalProfile,
    error
  };
} 
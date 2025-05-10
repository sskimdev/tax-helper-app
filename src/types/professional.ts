// src/types/professional.ts
export type Professional = {
  id: string; // uuid
  user_id?: string | null; // auth.users.id와 연결 (Supabase 'professionals' 테이블의 user_id 컬럼)
  created_at: string; // timestamptz
  name: string;
  email?: string | null;
  profile_image_url?: string | null;
  specialties?: string[] | null;
  location?: string | null;
  introduction?: string | null;
  rating?: number | null;
  review_count?: number | null;
  is_verified: boolean;
};
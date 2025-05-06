// src/types/professional.ts

export type Professional = {
    id: string; // uuid
    user_id?: string | null; // uuid, nullable (아직 전문가 계정과 완전히 연동되지 않았을 수 있음)
    created_at: string; // timestamptz
    name: string;
    email?: string | null;
    profile_image_url?: string | null;
    specialties?: string[] | null; // text[]
    location?: string | null;
    introduction?: string | null;
    rating?: number | null;
    review_count?: number | null;
    is_verified: boolean;
  }
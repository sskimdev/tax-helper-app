// src/types/filingRequest.ts
import { z } from "zod";

// 소득 종류 옵션 (Select 컴포넌트에서 사용)
export const INCOME_TYPES = [
  '근로소득',
  '사업소득(간편장부)',
  '사업소득(복식부기)',
  '프리랜서(3.3%)',
  '기타소득',
  '주택임대소득',
  '해외소득',
  '문의필요/기타',
] as const; // as const: 문자열 리터럴 타입으로 추론

// Zod 스키마 정의 (폼 유효성 검사용)
export const filingRequestSchema = z.object({
  tax_year: z.number({ required_error: "신고 연도를 선택해주세요." }).int().min(2020, "유효한 연도를 선택해주세요.").max(new Date().getFullYear(), "미래 연도는 선택할 수 없습니다."),
  income_type: z.enum(INCOME_TYPES, { required_error: "소득 종류를 선택해주세요." }),
  estimated_income: z.number({ coerce: true }) // 문자열 입력을 숫자로 강제 변환
                   .positive("예상 수입은 0보다 커야 합니다.")
                   .optional() // 선택 사항
                   .or(z.literal(0)) // 0도 허용 (선택 사항이므로)
                   .or(z.nan()), // NaN 허용 (선택 사항이므로) - 입력 안했을때 NaN이 될 수 있음
  details: z.string().max(1000, "추가 요청사항은 1000자 이내로 입력해주세요.").optional(),
});

// Zod 스키마로부터 TypeScript 타입 추론
export type FilingRequestFormData = z.infer<typeof filingRequestSchema>;

// Supabase 데이터베이스 테이블 타입 정의 (더 상세하게 정의할 수 있음)
// 실제 DB 컬럼과 일치시키는 것이 중요
export type FilingRequest = {
  id: string; // uuid
  user_id: string; // uuid
  created_at: string; // timestamptz
  tax_year: number;
  income_type: typeof INCOME_TYPES[number]; // enum 타입 활용
  estimated_income?: number | null; // numeric, nullable
  status: 'submitted' | 'assigned' | 'processing' | 'completed' | 'cancelled'; // text
  details?: string | null; // text, nullable
  assigned_professional_id?: string | null; // uuid, nullable
  fee?: number | null; // numeric, nullable
  payment_status?: 'pending' | 'paid' | 'failed'; // text, nullable
}
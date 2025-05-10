// src/types/filingRequest.ts
import { z } from "zod";

export const INCOME_TYPES = [
  '근로소득',
  '사업소득(간편장부)',
  '사업소득(복식부기)',
  '프리랜서(3.3%)',
  '기타소득',
  '주택임대소득',
  '해외소득',
  '문의필요/기타',
] as const;

export const filingRequestSchema = z.object({
  tax_year: z.number({ required_error: "신고 연도를 선택해주세요." }).int().min(2020).max(new Date().getFullYear()),
  income_type: z.enum(INCOME_TYPES, { required_error: "소득 종류를 선택해주세요." }),
  estimated_income: z.number({ coerce: true })
                   .positive("예상 수입은 0보다 커야 합니다.")
                   .optional()
                   .or(z.literal(0))
                   .or(z.nan()),
  details: z.string().max(1000, "추가 요청사항은 1000자 이내로 입력해주세요.").optional(),
});

export type FilingRequestFormData = z.infer<typeof filingRequestSchema>;

export type AttachedFile = {
  name: string;
  path: string;
  url?: string;
  size: number;
  type: string;
  uploaded_at: string;
};

export type FilingRequest = {
  id: string;
  user_id: string;
  created_at: string;
  tax_year: number;
  income_type: typeof INCOME_TYPES[number];
  estimated_income?: number | null;
  status: 'submitted' | 'assigned' | 'processing' | 'completed' | 'cancelled';
  details?: string | null;
  assigned_professional_id?: string | null;
  fee?: number | null;
  payment_status?: 'pending' | 'paid' | 'failed';
  attached_files?: AttachedFile[] | null;
};
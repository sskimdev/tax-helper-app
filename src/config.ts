// src/config.ts
// 환경 변수에서 스토리지 버킷 이름을 가져옵니다.
// .env 파일에 정의된 VITE_FILING_ATTACHMENTS_BUCKET 값을 사용합니다.
const filingAttachmentsBucketFromEnv = import.meta.env.VITE_FILING_ATTACHMENTS_BUCKET;

if (!filingAttachmentsBucketFromEnv) {
  console.warn(
    "환경 변수 VITE_FILING_ATTACHMENTS_BUCKET이(가) 설정되지 않았습니다. 기본값 'filing-attachments'를 사용합니다."
  );
}

export const FILING_ATTACHMENTS_BUCKET: string = filingAttachmentsBucketFromEnv || 'filing-attachments'; // 환경 변수가 없으면 기본값 사용
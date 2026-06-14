# rentflow — 사전 설정 작업 지시서 (사용자용 체크리스트)

> 앱 개발/배포는 모두 완료되었습니다. 아래는 **사용자(방대원)님이 직접 채워야 하는 공백** 입니다.
> 코드 변경 없이 Supabase·GitHub 설정만 하면 기능이 순차적으로 켜집니다.
> 배포 URL: https://bangdw-hash.github.io/rentflow-manager/

---

## ✅ 0. 이미 완료된 것
- GitHub Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록 → 데이터 연결 정상
- DB 테이블 6개 생성(`database/schema.sql`)
- GitHub Pages 자동 배포(main 머지 시)

---

## 1. 로그인 즉시 사용 (필수)
**Supabase → Authentication → Providers → Email → "Confirm email" 끄기 → Save**
- 끄면 회원가입 즉시 로그인됩니다. (켜두면 메일 인증 필요)
- 앱에서 로그인 화면 → **회원가입** 으로 계정 생성.
- 로그인 없이 둘러보려면 로그인 화면의 **"로그인 없이 둘러보기"** 사용.

## 2. 계약서 파일 업로드/OCR 저장용 스토리지 (계약서 첨부 쓸 때)
**Supabase → Storage → New bucket → 이름 `contracts` → Public 체크 → 생성**
- 임차인/계약 등록 시 계약서 파일 업로드에 사용됩니다. (없으면 업로드만 실패, 나머지는 정상)

## 3. SQL 마이그레이션 (Supabase → SQL Editor 에서 실행)
실행 순서:
1. `database/schema.sql` — (이미 실행됨) 기본 테이블
2. `database/plans.sql` — **구독 플랜(profiles)**. 실행하면 Free/Pro 한도 관리가 작동.
3. `database/auth_rls.sql` — **계정별 데이터 격리(RLS)**. 여러 임대인이 각자 데이터만 보게 하려면 실행.
   - ⚠️ 실행 후엔 기존(소유자 없는) 데이터가 숨겨집니다. 파일 안 [백필] 주석에서 본인 UUID로 교체 후 실행하면 귀속됩니다.
   - 둘러보기(게스트) 모드는 RLS 적용 후 데이터 접근이 제한됩니다.

## 4. 구독 플랜 한도 (11단계)
- **Free**: 매물 3 · 임차인 5 · 카카오 알림 월 10건. 초과 시 업그레이드 모달 표시.
- **Pro로 해제**: `database/plans.sql` 실행 후
  `update profiles set plan = 'pro' where id = '본인-UUID';`
  (UUID는 Authentication → Users 에서 확인)

## 5. OCR (계약서 자동 입력) — 선택
Naver Clova OCR 사용 시 GitHub → Settings → Secrets and variables → Actions 에 추가:
- `VITE_CLOVA_OCR_URL` = Clova OCR API 엔드포인트
- `VITE_CLOVA_OCR_SECRET` = Clova OCR 시크릿
- 추가 후 재배포되어야 적용(아무 커밋이나 main 푸시, 또는 Actions 재실행).

## 6. 카카오 알림 — 선택
- `VITE_KAKAO_API_KEY` = 카카오 REST API 키 (위와 동일하게 Secrets에 추가)
- ⚠️ 브라우저에서 카카오 API 직접 호출은 CORS 제한이 있을 수 있습니다.
  실제 자동 발송까지 하려면 **Supabase Edge Function(서버)** 경유가 권장됩니다(후속 작업).

## 7. 전자(세금)계산서 — 현재 가능 범위
- 앱에서 **계산서 PDF 발행** + **홈택스 일괄발행용 엑셀 내보내기** 제공.
- ⚠️ **홈택스 직접 전송은 불가**(공인인증·사업자 인증 + 서버 필요).
  완전 자동 발행을 원하면 **팝빌/바로빌 API + Edge Function** 연동이 별도로 필요합니다(유료 API 계약).
- `계산서` 메뉴에서 **공급자(임대인) 정보**를 먼저 입력하세요(기기에 저장됨).

---

## 후속 개발 후보 (요청 시 진행)
- 카카오 자동 발송 스케줄러 (Supabase Edge Function + cron)
- 전자계산서 자동 발행 (팝빌/바로빌 API)
- 결제 연동(구독 자동화), 매물 사진 업로드, 실수령 기반 세무 정산 고도화

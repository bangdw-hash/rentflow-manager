-- =============================================================
-- rentflow — 계정별 데이터 격리(멀티테넌트) 마이그레이션
-- Supabase SQL Editor 에서 "로그인 기능을 켠 뒤" 실행하세요.
--
-- 동작 원리:
--  - 각 테이블에 owner_id 추가, 기본값 default auth.uid()
--    → 앱에서 INSERT 시 코드 변경 없이 현재 로그인 사용자 id가 자동 기록됨
--  - RLS(Row Level Security)로 본인 소유 행만 조회/수정 가능
--
-- ⚠️ 실행 전 주의:
--  - 이 스크립트를 실행하면 기존(소유자 없는) 데이터는 숨겨집니다.
--    아래 [백필] 단계에서 'YOUR-USER-UUID' 를 본인 계정 UUID로 바꿔 실행하면
--    기존 데이터가 본인 계정으로 귀속됩니다.
--    (본인 UUID는 Authentication → Users 에서 확인)
-- =============================================================

-- 1) owner_id 컬럼 추가 (기본값 = 현재 로그인 사용자)
alter table properties     add column if not exists owner_id uuid default auth.uid();
alter table tenants        add column if not exists owner_id uuid default auth.uid();
alter table contracts      add column if not exists owner_id uuid default auth.uid();
alter table utility_bills  add column if not exists owner_id uuid default auth.uid();
alter table payments       add column if not exists owner_id uuid default auth.uid();
alter table notifications  add column if not exists owner_id uuid default auth.uid();

-- 2) [백필] 기존 데이터를 본인 계정으로 귀속 (UUID 교체 후 실행)
-- update properties    set owner_id = 'YOUR-USER-UUID' where owner_id is null;
-- update tenants       set owner_id = 'YOUR-USER-UUID' where owner_id is null;
-- update contracts     set owner_id = 'YOUR-USER-UUID' where owner_id is null;
-- update utility_bills set owner_id = 'YOUR-USER-UUID' where owner_id is null;
-- update payments      set owner_id = 'YOUR-USER-UUID' where owner_id is null;
-- update notifications set owner_id = 'YOUR-USER-UUID' where owner_id is null;

-- 3) RLS 활성화
alter table properties     enable row level security;
alter table tenants        enable row level security;
alter table contracts      enable row level security;
alter table utility_bills  enable row level security;
alter table payments       enable row level security;
alter table notifications  enable row level security;

-- 4) 정책: 본인 소유 행만 전체 권한
create policy "own_rows" on properties    for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_rows" on tenants       for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_rows" on contracts     for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_rows" on utility_bills for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_rows" on payments      for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_rows" on notifications for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 참고: 되돌리려면 각 테이블에 대해
--   alter table <t> disable row level security;
--   drop policy "own_rows" on <t>;

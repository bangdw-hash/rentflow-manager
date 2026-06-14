-- =============================================================
-- rentflow — 구독 플랜(profiles) 마이그레이션
-- Supabase SQL Editor 에서 실행하세요. (로그인 기능 사용 시)
-- =============================================================

-- 1) 사용자 프로필/플랜 테이블
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text default 'free',           -- 'free' | 'pro'
  created_at timestamptz default now()
);

-- 2) 가입 시 profiles 행 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, plan) values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) RLS: 본인 프로필만 조회/수정
alter table profiles enable row level security;
create policy "own_profile" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- 4) 특정 사용자를 Pro 로 올리기 (UUID 교체)
-- update profiles set plan = 'pro' where id = 'YOUR-USER-UUID';

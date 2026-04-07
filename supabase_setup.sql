-- Supabase SQL Editor에서 이 쿼리를 실행하세요

CREATE TABLE IF NOT EXISTS daily_checks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  checks jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- 실시간 동기화 활성화
ALTER TABLE daily_checks REPLICA IDENTITY FULL;

-- 누구나 읽기/쓰기 가능 (직원 전용 앱이므로)
CREATE POLICY "allow_all" ON daily_checks
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE daily_checks ENABLE ROW LEVEL SECURITY;

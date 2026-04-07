# BDD 공간관리 체크리스트 웹앱

React + Supabase + Vercel으로 만든 실시간 공유 체크리스트 대시보드입니다.

---

## 배포 방법 (3단계, 약 15분)

### 1단계: Supabase 설정 (DB 서버, 무료)

1. https://supabase.com 접속 → **Start your project** 클릭
2. GitHub 계정으로 로그인
3. **New project** 클릭
   - Name: `bdd-checklist`
   - Password: 아무 비밀번호 입력
   - Region: **Northeast Asia (Seoul)** 선택
4. 프로젝트 생성 후 좌측 메뉴 → **SQL Editor** 클릭
5. `supabase_setup.sql` 파일 내용을 전체 복사 후 붙여넣기 → **Run** 클릭
6. 좌측 메뉴 → **Settings** → **API** 클릭
   - `Project URL` 복사해두기 → VITE_SUPABASE_URL
   - `anon public` key 복사해두기 → VITE_SUPABASE_ANON_KEY
7. 좌측 메뉴 → **Realtime** → `daily_checks` 테이블 활성화

---

### 2단계: GitHub에 코드 올리기

1. https://github.com 접속 → **New repository** 클릭
   - Repository name: `bdd-checklist`
   - Public 선택 → **Create repository**
2. 컴퓨터에서 터미널 열기 (Mac: 터미널 앱 / Windows: Git Bash)
3. 다운로드한 `bdd-checklist` 폴더로 이동 후 아래 명령어 입력:

```bash
cd bdd-checklist
git init
git add .
git commit -m "첫 배포"
git branch -M main
git remote add origin https://github.com/[내GitHub아이디]/bdd-checklist.git
git push -u origin main
```

---

### 3단계: Vercel 배포 (웹 호스팅, 무료)

1. https://vercel.com 접속 → **Continue with GitHub** 로그인
2. **New Project** 클릭 → `bdd-checklist` 저장소 선택 → **Import**
3. **Environment Variables** 섹션에서 아래 두 개 추가:
   - `VITE_SUPABASE_URL` = (1단계에서 복사한 URL)
   - `VITE_SUPABASE_ANON_KEY` = (1단계에서 복사한 anon key)
4. **Deploy** 클릭!
5. 배포 완료 후 `https://bdd-checklist-xxx.vercel.app` 주소 생성됨

---

## 직원들과 공유하기

배포 완료 후 Vercel에서 제공하는 URL을 직원들에게 공유하세요.
- 같은 URL을 열면 **실시간으로 체크 상태가 동기화**됩니다.
- 매일 자정에 새 날짜가 자동으로 시작됩니다.
- 모바일에서도 완벽하게 동작합니다.

---

## 로컬에서 테스트하기

```bash
# 패키지 설치
npm install

# .env 파일 만들기
cp .env.example .env
# .env 파일을 열어서 Supabase URL과 Key 입력

# 개발 서버 시작
npm run dev
```

브라우저에서 http://localhost:5173 접속

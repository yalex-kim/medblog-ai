# 관리자 인증 시스템 설정 가이드

## 📋 개요

관리자 페이지 접근을 보호하기 위한 DB 기반 인증 시스템이 구현되었습니다.

## 🔧 설정 단계

### 1. 데이터베이스 마이그레이션 실행

Supabase Dashboard → SQL Editor에서 다음 파일을 실행:

```
supabase-migrations/create-admins-table.sql
```

이 마이그레이션은:
- `admins` 테이블 생성
- 기본 관리자 계정 생성 (username: `admin`, password: `admin123!`)

### 2. 첫 로그인 및 비밀번호 변경

1. `/admin/login` 페이지 접속
2. 기본 계정으로 로그인:
   - ID: `admin`
   - 비밀번호: `admin123!`
3. **즉시 비밀번호를 변경하세요!** (보안상 매우 중요)

### 3. 비밀번호 변경 방법

현재는 Supabase Dashboard를 통해 변경:

```sql
-- bcrypt로 새 비밀번호 해시 생성 (bcrypt 라운드 10)
-- https://bcrypt-generator.com/ 에서 생성 가능

UPDATE admins
SET password_hash = 'your_new_bcrypt_hash_here',
    updated_at = now()
WHERE username = 'admin';
```

## 🔒 보안 기능

### 구현된 보안 요소

1. **세션 기반 인증**
   - 24시간 유효 세션
   - HttpOnly 쿠키로 XSS 방어
   - 일반 병원 세션과 완전히 분리 (`type: 'admin'`)

2. **API 보호**
   - 모든 `/api/admin/*` 엔드포인트에 세션 검증
   - 401 Unauthorized 응답으로 미인증 차단

3. **페이지 보호**
   - `/admin` 페이지 접근 시 자동 인증 체크
   - 미인증 시 `/admin/login`으로 리다이렉트

4. **비밀번호 보안**
   - bcrypt 해싱 (rounds=10)
   - 데이터베이스에 평문 저장 안 함

### 향후 개선 가능 항목

1. **비밀번호 변경 UI**
   - `/admin/change-password` 페이지 추가
   - 관리자가 직접 변경 가능

2. **다중 관리자**
   - 새 관리자 계정 생성 UI
   - 역할 기반 권한 (super_admin, admin, viewer)

3. **감사 로그**
   - 관리자 활동 기록
   - 병원 계정 생성/수정 이력 추적

4. **2FA (Two-Factor Authentication)**
   - TOTP 기반 2단계 인증

## 📊 데이터베이스 스키마

### `admins` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| username | TEXT | 로그인 ID (고유) |
| password_hash | TEXT | bcrypt 해시 |
| role | TEXT | 역할 (super_admin, admin, viewer) |
| full_name | TEXT | 관리자 이름 |
| email | TEXT | 이메일 |
| is_active | BOOLEAN | 활성화 여부 |
| last_login_at | TIMESTAMPTZ | 마지막 로그인 시간 |
| created_at | TIMESTAMPTZ | 생성 시간 |
| updated_at | TIMESTAMPTZ | 수정 시간 |

## 🚦 사용 흐름

### 관리자 로그인
```
/admin/login → 인증 확인 → /admin (대시보드)
```

### 미인증 접근 차단
```
/admin → 세션 없음 → /admin/login (리다이렉트)
```

### API 호출
```
fetch('/api/admin/hospitals')
  → admin_session 쿠키 체크
  → 유효하면 데이터 반환
  → 무효하면 401 Unauthorized
```

## ⚠️ 중요 보안 노트

1. **기본 비밀번호 즉시 변경**: `admin123!`은 테스트용입니다
2. **프로덕션 환경**: 강력한 비밀번호 정책 적용
3. **HTTPS 필수**: 프로덕션에서는 반드시 HTTPS 사용
4. **세션 쿠키 보안**: `secure` 플래그는 프로덕션에서 자동 활성화됨

## 📝 추가 관리자 계정 생성

Supabase SQL Editor에서:

```sql
-- bcrypt 해시를 먼저 생성 (https://bcrypt-generator.com/)
INSERT INTO admins (username, password_hash, role, full_name, email)
VALUES (
  'new_admin',
  '$2a$10$your_bcrypt_hash_here',
  'admin',
  'New Admin Name',
  'newadmin@example.com'
);
```

## 🔍 문제 해결

### 로그인이 안 될 때
1. 브라우저 쿠키 확인 (admin_session)
2. 데이터베이스에서 관리자 계정 확인:
   ```sql
   SELECT * FROM admins WHERE username = 'admin';
   ```
3. 비밀번호 해시 재생성 및 업데이트

### API 401 오류
1. 브라우저 개발자 도구 → Application → Cookies 확인
2. admin_session 쿠키가 있고 유효한지 확인
3. 만료 시간(exp) 체크

## 🎯 다음 단계

1. ✅ 마이그레이션 실행
2. ✅ 첫 로그인 테스트
3. ⚠️ 기본 비밀번호 변경
4. 📌 필요시 추가 관리자 계정 생성
5. 🔐 프로덕션 배포 시 보안 체크리스트 확인

# Database Migrations

## 마이그레이션 적용 방법

### Supabase Dashboard에서 적용하기

1. Supabase Dashboard에 로그인합니다
2. 프로젝트를 선택합니다
3. 좌측 메뉴에서 `SQL Editor`를 클릭합니다
4. `New Query`를 클릭합니다
5. 마이그레이션 파일의 내용을 복사하여 붙여넣습니다
6. `Run` 버튼을 클릭하여 실행합니다

### 적용할 마이그레이션

#### 1. add_image_type_column.sql (2025-10-18)

**목적:** blog_images 테이블에 image_type 컬럼 추가

**변경사항:**
- `image_type` VARCHAR(20) 컬럼 추가
- 이미지 타입 (INTRO, MEDICAL, LIFESTYLE, WARNING, CTA, INFOGRAPHIC) 저장
- 인덱스 추가로 쿼리 성능 향상

**적용 필수:** 예

이 마이그레이션을 적용하지 않으면 이미지 타입 정보가 데이터베이스에 저장되지 않습니다.

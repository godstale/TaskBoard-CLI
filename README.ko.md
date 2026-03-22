# TaskBoard CLI

[TaskOps](https://github.com/godstale/TaskOps) 프로젝트의 작업 현황을 시각화하는 터미널 도구.
TaskOps가 생성한 `taskops.db` SQLite 파일을 읽기 전용으로 참조하며,
Epic/Task 계층 구조, 작업 이력, 리소스를 Ink 5 TUI 앱으로 표시합니다.

> English README → [README.md](README.md)

---

## 사전 요구사항

- Node.js 18+
- pnpm 8+
- [TaskOps](https://github.com/godstale/TaskOps) — TaskBoard CLI는 TaskOps가 생성한 `taskops.db` 없이는 동작하지 않습니다.

---

## 설치

```bash
git clone https://github.com/godstale/TaskBoard-CLI.git
cd TaskBoard-CLI
pnpm install
```

> **Windows 주의사항**
> PowerShell에서 `pnpm` 실행 시 스크립트 실행 정책 오류가 발생할 수 있습니다.
> 아래 두 방법 중 하나를 사용하세요.
>
> **방법 1 — ExecutionPolicy 변경 (권장):**
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
>
> **방법 2 — cmd.exe 또는 Git Bash 사용:**
> PowerShell 대신 명령 프롬프트(cmd.exe)나 Git Bash에서 실행하면 정책 오류 없이 동작합니다.

---

## 실행

### Step 1 — 빌드 (최초 1회 또는 소스 변경 후)

```bash
pnpm build
```

### Step 2 — 실행

```bash
# 개발 모드 (tsx를 통한 라이브 리로드)
pnpm dev -- --path /path/to/taskops-root

# 또는 빌드된 파일을 직접 실행
node dist/index.js --path /path/to/taskops-root
```

> `taskops-root`는 `<project-name>/taskops.db` 구조를 포함하는 **상위 폴더**입니다.
> 예: 프로젝트가 `~/work/my-project/taskops.db`라면 `--path ~/work`를 지정합니다.

`--path`를 생략하면 실행 시 경로를 대화형으로 입력할 수 있습니다.

**키보드 단축키:**

| 키 | 동작 |
|----|------|
| `Tab` / `Shift+Tab` | 화면 전환 (순방향/역방향) |
| `R` | 데이터 새로고침 |
| `Q` | 종료 |
| `↑` / `↓` | Task 선택 (Dashboard); 작업 이력 스크롤 (Task Operations) |
| `Enter` | 선택한 Task의 Task Operations 화면으로 이동 (Dashboard) |
| `←` / `→` | Task 선택 (Task Operations 화면) |

---

## TaskOps와 연동 방법

TaskOps 스킬을 실행하면 프로젝트 루트에 아래 파일들이 생성됩니다.

```
MyProject/                ← TaskOps 프로젝트 폴더 (VS Code에서 열린 폴더)
├── taskops.db            ← TaskOps가 생성하는 SQLite DB
├── TODO.md
├── TASK_OPERATIONS.md
├── AGENTS.md
├── SETTINGS.md
├── docs/plans/
└── resources/
```

TaskBoard CLI는 이 구조에서 `taskops.db`를 찾기 위해 **프로젝트 폴더의 부모 디렉토리**를 `--path`로 받습니다.

```
workspace/                ← 이 경로를 --path 에 지정
└── MyProject/
    └── taskops.db
```

**예시:**

```bash
# MyProject가 ~/workspace/MyProject/ 에 있을 경우
node dist/index.js --path ~/workspace/

# Windows 예시
node dist/index.js --path C:/workspace/
```

TaskBoard는 지정된 폴더의 하위 디렉토리를 스캔하여 `taskops.db`가 있는 프로젝트를 모두 목록에 표시합니다.
여러 프로젝트를 동시에 관리하는 경우 공통 상위 폴더를 지정하면 됩니다.

DB 파일이 변경되면 chokidar(파일 감시) + 3초 폴링 fallback으로 자동 갱신됩니다.

---

## 화면 구성

| 화면 | 설명 |
|------|------|
| **Dashboard** | Epic/Task 계층 + 진행률 바 |
| **Task Operations** | 텍스트 작업 이력 타임라인 |
| **Resources** | 리소스 파일 목록 + 타입 컬러 |
| **Settings** | Key/Value 설정 테이블 |

---

## 테스트

```bash
# 전체 테스트
pnpm test

# 감시 모드
pnpm test:watch
```

샘플 DB 재생성:

```bash
node example/create-sample-db.js
```

---

## 프로젝트 구조

```
TaskBoard-CLI/
├── src/
│   ├── core/       # SQLite 쿼리 + 파일 감시
│   ├── screens/    # Ink 5 TUI 화면 컴포넌트
│   ├── App.tsx
│   ├── index.tsx   # 진입점 + CLI 인수 파싱
│   └── useTaskBoard.ts
├── tests/          # Vitest 테스트
├── example/        # 샘플 TaskOps 프로젝트 폴더 + sample.db
└── docs/
    └── architecture.md  # 아키텍처·구현 상세 문서
```

아키텍처 상세 → [`docs/architecture.md`](docs/architecture.md)
변경 이력 → [`CHANGELOG.md`](CHANGELOG.md)

---

## 관련 프로젝트

- [TaskOps](https://github.com/godstale/TaskOps) — AI Agent용 프로젝트 관리 도구 (데이터 소스)

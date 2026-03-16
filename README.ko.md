# TaskBoard

[TaskOps](https://github.com/godstale/TaskOps) 프로젝트의 작업 현황을 시각화하는 도구.
TaskOps가 생성한 `taskops.db` SQLite 파일을 읽기 전용으로 참조하며, 두 가지 앱을 제공합니다:

- **TUI** — Ink 5 터미널 앱
- **Electron** — Electron 33 + React 18 데스크탑 앱

> English README → [README.md](README.md)

---

## 사전 요구사항

- Node.js 18+
- pnpm 8+
- [TaskOps](https://github.com/godstale/TaskOps) — TaskBoard는 TaskOps가 생성한 `taskops.db` 없이는 동작하지 않습니다.

---

## 설치

```bash
git clone https://github.com/godstale/TaskBoard.git
cd TaskBoard
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

### TUI (터미널)

TUI를 실행하려면 `dist/` 빌드 파일이 필요합니다.

**Step 1 — 빌드 (최초 1회 또는 소스 변경 후):**

```bash
pnpm build:tui
```

**Step 2 — 실행:**

```bash
# 개발 모드 (core 재빌드 + 라이브 리로드)
pnpm dev:tui -- --path /path/to/taskops-root

# 또는 빌드된 파일을 직접 실행
node packages/tui/dist/index.js --path /path/to/taskops-root
```

> `taskops-root`는 `<project-name>/taskops.db` 구조를 포함하는 **상위 폴더**입니다.
> 예: 프로젝트가 `~/work/my-project/taskops.db`라면 `--path ~/work`를 지정합니다.

**키보드 단축키:**

| 키 | 동작 |
|----|------|
| `Tab` | 화면 전환 |
| `R` | 데이터 새로고침 |
| `Q` | 종료 |
| `←` / `→` | Task 선택 (Task Operations 화면) |

---

### Electron (데스크탑)

> **참고:** `better-sqlite3`는 네이티브 모듈입니다. Electron은 시스템 Node.js와 다른 V8 ABI를 사용하므로, `pnpm install` 시 `postinstall` 훅이 자동으로 Electron 전용 바이너리를 다운로드합니다.
> `electron` 또는 `better-sqlite3` 버전을 업그레이드했다면 아래 명령으로 수동 재빌드하세요:
> ```bash
> pnpm rebuild:electron
> ```

**개발 모드 (Vite dev server + Electron 동시 실행):**

```bash
pnpm --filter @taskboard/electron dev
```

> Vite 개발 서버(port 5173)를 띄운 뒤 Electron을 실행합니다.
> 앱 실행 후 OS 네이티브 폴더 선택 다이얼로그로 TaskOps 루트 폴더를 지정합니다.

**프로덕션 빌드 (배포용 바이너리):**

```bash
# 1. 렌더러(React) + 메인 프로세스 빌드
pnpm --filter @taskboard/electron build

# 2. 설치 프로그램 패키징 (Windows: .exe NSIS, macOS: .dmg, Linux: .AppImage)
pnpm --filter @taskboard/electron package
```

패키징 완료 후 `packages/electron/release/` 폴더에 인스톨러가 생성됩니다.

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

TaskBoard는 이 구조에서 `taskops.db`를 찾기 위해 **프로젝트 폴더의 부모 디렉토리**를 `--path`로 받습니다.

```
workspace/                ← 이 경로를 --path 에 지정
└── MyProject/
    └── taskops.db
```

**예시:**

```bash
# MyProject가 ~/workspace/MyProject/ 에 있을 경우
node packages/tui/dist/index.js --path ~/workspace/

# Windows 예시
node packages/tui/dist/index.js --path C:/workspace/
```

Electron의 경우 폴더 선택 다이얼로그에서 `workspace/` 폴더를 선택합니다.

TaskBoard는 지정된 폴더의 하위 디렉토리를 스캔하여 `taskops.db`가 있는 프로젝트를 모두 목록에 표시합니다.
여러 프로젝트를 동시에 관리하는 경우 공통 상위 폴더를 지정하면 됩니다.

DB 파일이 변경되면 chokidar(파일 감시) + 3초 폴링 fallback으로 자동 갱신됩니다.

---

## 화면 구성

| 화면 | TUI | Electron |
|------|-----|----------|
| **Dashboard** | Epic/Task 계층 + 진행률 바 | 요약 카드 + Epic/Task 계층 |
| **Task Operations** | 텍스트 operation 타임라인 | ReactFlow 노드-엣지 다이어그램 |
| **Resources** | 리소스 파일 목록 + 타입 컬러 | 리소스 목록 + 타입 배지 |
| **Settings** | Key/Value 설정 테이블 | Key/Value 설정 테이블 |

---

## 테스트

```bash
# 전체 테스트
pnpm test

# 패키지별 실행
pnpm --filter @taskboard/core test
pnpm --filter @taskboard/tui test
pnpm --filter @taskboard/electron test        # Vitest
pnpm --filter @taskboard/electron test:e2e    # Playwright E2E
```

테스트 픽스처 DB 재생성:

```bash
node fixtures/create-fixture.js
```

---

## 프로젝트 구조

```
TaskBoard/
├── packages/
│   ├── core/       # @taskboard/core — DB 연결·쿼리·파일 감시
│   ├── tui/        # @taskboard/tui  — Ink 5 터미널 앱
│   └── electron/   # @taskboard/electron — Electron 33 데스크탑 앱
├── fixtures/
│   └── fixture.db  # 테스트용 샘플 DB
└── docs/
    └── architecture.md  # 아키텍처·구현 상세 문서
```

아키텍처 상세 → [`docs/architecture.md`](docs/architecture.md)
변경 이력 → [`CHANGELOG.md`](CHANGELOG.md)

---

## 관련 프로젝트

- [TaskOps](https://github.com/godstale/TaskOps) — AI Agent용 프로젝트 관리 도구 (데이터 소스)

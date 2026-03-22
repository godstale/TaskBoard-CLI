import Database from 'better-sqlite3'

export function createTestDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, type TEXT NOT NULL,
      title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'todo',
      parent_id TEXT, workflow_id TEXT, todo TEXT, interrupt TEXT,
      milestone_target TEXT, due_date TEXT,
      seq_order INTEGER, parallel_group TEXT, depends_on TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE workflows (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
      title TEXT NOT NULL, source_file TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL,
      operation_type TEXT NOT NULL, agent_platform TEXT, summary TEXT,
      details TEXT, subagent_used INTEGER DEFAULT 0, subagent_result TEXT,
      started_at TEXT, completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      tool_name TEXT, skill_name TEXT, mcp_name TEXT,
      retry_count INTEGER DEFAULT 0,
      input_tokens INTEGER, output_tokens INTEGER, duration_seconds INTEGER
    );
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL,
      file_path TEXT NOT NULL, description TEXT,
      res_type TEXT NOT NULL DEFAULT 'reference',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note TEXT,
      snapshot TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  db.exec(`
    INSERT INTO tasks VALUES ('TST','TST','project','Test Project',NULL,'in_progress',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,datetime('now'),datetime('now'));
    INSERT INTO tasks VALUES ('TST-E001','TST','epic','인증 시스템',NULL,'in_progress','TST',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,datetime('now'),datetime('now'));
    INSERT INTO tasks VALUES ('TST-T001','TST','task','로그인 API',NULL,'done','TST-E001','TST-W001',NULL,NULL,NULL,NULL,1,NULL,NULL,datetime('now'),datetime('now'));
    INSERT INTO tasks VALUES ('TST-T002','TST','task','회원가입 API',NULL,'in_progress','TST-E001','TST-W001',NULL,NULL,NULL,NULL,2,'auth-group',NULL,datetime('now'),datetime('now'));
    INSERT INTO tasks VALUES ('TST-T003','TST','task','JWT 검증',NULL,'todo','TST-E001','TST-W001',NULL,NULL,NULL,NULL,3,NULL,'["TST-T001"]',datetime('now'),datetime('now'));
    INSERT INTO tasks VALUES ('TST-O001','TST','objective','MVP 완료',NULL,'todo','TST',NULL,NULL,NULL,'Core features done','2026-04-01',NULL,NULL,NULL,datetime('now'),datetime('now'));
    INSERT INTO workflows VALUES ('TST-W001','TST','인증 워크플로우','TODO.md','active',datetime('now'));
    INSERT INTO operations (id, task_id, operation_type, agent_platform, summary,
      details, subagent_used, subagent_result, started_at, completed_at, created_at,
      tool_name, skill_name, mcp_name, retry_count, input_tokens, output_tokens, duration_seconds)
    VALUES (1,'TST-T001','start','claude_code',NULL,
      NULL,0,NULL,datetime('now'),NULL,datetime('now'),
      NULL,NULL,NULL,0,NULL,NULL,NULL);
    INSERT INTO operations (id, task_id, operation_type, agent_platform, summary,
      details, subagent_used, subagent_result, started_at, completed_at, created_at,
      tool_name, skill_name, mcp_name, retry_count, input_tokens, output_tokens, duration_seconds)
    VALUES (2,'TST-T001','complete','claude_code','로그인 API 완료',
      NULL,0,NULL,datetime('now'),datetime('now'),datetime('now'),
      'Edit',NULL,NULL,0,1200,450,42);
    INSERT INTO resources VALUES (1,'TST-T001','./docs/spec.md','API 스펙','input',datetime('now'));
    INSERT INTO settings VALUES ('autonomy_level','moderate','Agent 자율성',datetime('now'));
    INSERT INTO checkpoints VALUES (1,'before-refactor','{"TST-T001":{"status":"done","interrupt":null},"TST-T002":{"status":"todo","interrupt":null}}',datetime('now'));
  `)

  return db
}

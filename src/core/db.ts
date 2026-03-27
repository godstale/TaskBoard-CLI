import Database from 'better-sqlite3'

export type Db = Database.Database

/**
 * TaskOps DB 파일을 연다.
 * @param dbPath DB 파일 경로
 * @param readonly 읽기 전용 여부 (기본값 true)
 */
export function openDb(dbPath: string, readonly: boolean = true): Db {
  if (!readonly) {
    // 쓰기 모드일 때는 파일이 없으면 새로 생성될 수 있음 (기본 동작)
    return new Database(dbPath)
  }
  // 읽기 전용 모드: 파일이 없으면 에러 발생
  return new Database(dbPath, { readonly: true, fileMustExist: true })
}

export function closeDb(db: Db): void {
  db.close()
}

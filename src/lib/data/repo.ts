// 저장소 연결부. 체험판(기기 저장)과 실제 서버(Supabase)가 같은 모양으로 동작합니다.
import { allTables, type DB, type TableName, type Tables } from '../types'

export interface Repo {
  mode: 'demo' | 'cloud'
  /** 목록 표 전부 + 날짜 기록은 from 이후 */
  load(from: string): Promise<DB>
  /** 날짜 기록 중 from~to (더 지난 달을 볼 때) */
  loadRange(from: string, to: string): Promise<Partial<DB>>
  upsert<K extends TableName>(table: K, rows: Tables[K][]): Promise<void>
  remove(table: TableName, ids: string[]): Promise<void>
  putPhoto(path: string, blob: Blob): Promise<void>
  photoUrl(path: string): Promise<string | null>
  removePhoto(path: string): Promise<void>
}

export function emptyDB(): DB {
  const db = {} as Record<TableName, Map<string, unknown>>
  for (const t of allTables) db[t] = new Map()
  return db as DB
}

export function toDB(rows: Partial<{ [K in TableName]: Tables[K][] }>): DB {
  const db = emptyDB()
  for (const t of allTables) {
    const list = rows[t] as { id: string }[] | undefined
    if (list) for (const r of list) (db[t] as Map<string, unknown>).set(r.id, r)
  }
  return db
}

export function photoPath(date: string, mealId: string): string {
  return `${date}/${mealId}.jpg`
}

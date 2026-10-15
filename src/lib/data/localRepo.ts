// 체험판 저장소: 기록은 이 기기(localStorage)에만, 사진은 IndexedDB에 둡니다.
import { today } from '../dates'
import { allTables, datedTables, type DB, type TableName, type Tables } from '../types'
import { blobs, local } from '../storage'
import { demoData, demoPhoto, DEMO_PHOTO_PREFIX } from './demo'
import { seedSupplements } from '../seed'
import { toDB, type Repo } from './repo'

// v2: 러닝 루틴이 생기면서 예시 기록을 새로 채움
const KEY = 'wcc.demo.v2'
local.remove('wcc.demo.v1')

type Rows = { [K in TableName]: Tables[K][] }

function read(): Rows {
  const saved = local.getJSON<Rows>(KEY)
  if (saved && allTables.every((t) => Array.isArray(saved[t]))) return upgrade(saved)
  const fresh = demoData(today())
  local.setJSON(KEY, fresh)
  return fresh
}

/** 예전 체험 기록에 새로 생긴 칸 채우기 (영양제의 식단 성분) */
function upgrade(rows: Rows): Rows {
  if (rows.supplements.every((s) => 'kcal' in s)) return rows
  const seed = new Map(seedSupplements.map((s) => [s.id, s]))
  rows.supplements = rows.supplements.map((s) => {
    const base = seed.get(s.id)
    return { ...s, serving_g: base?.serving_g ?? null, protein_g: base?.protein_g ?? null, kcal: base?.kcal ?? null }
  })
  write(rows)
  return rows
}

function write(rows: Rows) {
  local.setJSON(KEY, rows)
}

const objectUrls = new Map<string, string>()

export function createLocalRepo(): Repo {
  return {
    mode: 'demo',
    async load(from) {
      const rows = read()
      const out = { ...rows } as Rows
      for (const t of datedTables) (out[t] as { date: string }[]) = (rows[t] as { date: string }[]).filter((r) => r.date >= from)
      return toDB(out)
    },
    async loadRange(from, to) {
      const rows = read()
      const out: Partial<Rows> = {}
      for (const t of datedTables) (out[t] as { date: string }[]) = (rows[t] as { date: string }[]).filter((r) => r.date >= from && r.date <= to)
      return toDB(out) as Partial<DB>
    },
    async upsert(table, list) {
      const rows = read()
      const map = new Map((rows[table] as { id: string }[]).map((r) => [r.id, r]))
      for (const r of list) map.set(r.id, r)
      ;(rows[table] as unknown[]) = [...map.values()]
      write(rows)
    },
    async remove(table, ids) {
      const rows = read()
      const drop = new Set(ids)
      ;(rows[table] as { id: string }[]) = (rows[table] as { id: string }[]).filter((r) => !drop.has(r.id))
      write(rows)
    },
    async putPhoto(path, blob) {
      await blobs.put(path, blob)
      const old = objectUrls.get(path)
      if (old) URL.revokeObjectURL(old)
      objectUrls.delete(path)
    },
    async photoUrl(path) {
      if (path.startsWith(DEMO_PHOTO_PREFIX)) return demoPhoto(path)
      const cached = objectUrls.get(path)
      if (cached) return cached
      const blob = await blobs.get(path)
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      objectUrls.set(path, url)
      return url
    },
    async removePhoto(path) {
      await blobs.remove(path)
    },
  }
}

/** 설정 → 체험 기록 처음으로 */
export async function resetDemo() {
  local.remove(KEY)
  await blobs.clear()
}

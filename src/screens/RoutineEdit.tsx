// 루틴 편집: 루틴 고르기, 이름, 운동 순서 위/아래, 세트 수 +/−, 빼기, 운동 추가 (5차 목업 v2)
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ExercisePicker from '../components/ExercisePicker'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'
import { BackButton } from '../components/ui'
import { routineExercises } from '../lib/domain'
import { newId } from '../lib/ids'
import { RUN_EXERCISE_ID } from '../lib/seed'
import { remove, upsert, useStore } from '../lib/store'
import type { DB, Routine } from '../lib/types'

interface Item {
  id?: string
  exerciseId: string
  sets: number
}

function load(db: DB, routineId: string | null): { name: string; items: Item[] } {
  if (!routineId) return { name: '', items: [] }
  return {
    name: db.routines.get(routineId)?.name ?? '',
    items: routineExercises(db, routineId).map((it) => ({ id: it.id, exerciseId: it.exercise_id, sets: it.default_sets })),
  }
}

export default function RoutineEdit() {
  const { db, index, apply } = useStore()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const routines = index.routines
  const startId = params.get('new') === '1' ? null : (params.get('id') ?? routines[0]?.id ?? null)
  const [routineId, setRoutineId] = useState<string | null>(startId)
  const [form, setForm] = useState(() => load(db, startId))
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const select = (id: string | null) => {
    setRoutineId(id)
    setForm(load(db, id))
    setError(null)
  }
  const setItems = (fn: (items: Item[]) => Item[]) => setForm((f) => ({ ...f, items: fn(f.items) }))
  const move = (i: number, d: number) =>
    setItems((items) => {
      const j = i + d
      if (j < 0 || j >= items.length) return items
      const next = [...items]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const total = form.items.reduce((a, x) => a + x.sets, 0)

  const save = () => {
    const name = form.name.trim()
    if (!name) return setError('루틴 이름을 적어 주세요')
    if (!form.items.length) return setError('운동을 하나 이상 넣어 주세요')
    const id = routineId ?? newId()
    const routine: Routine = {
      id,
      name,
      sort_order: routineId ? (db.routines.get(routineId)?.sort_order ?? 1) : Math.max(0, ...routines.map((r) => r.sort_order)) + 1,
    }
    const items = form.items.map((it, i) => ({ id: it.id ?? newId(), routine_id: id, exercise_id: it.exerciseId, position: i + 1, default_sets: it.sets }))
    const keep = new Set(items.map((i) => i.id))
    const old = routineId ? routineExercises(db, routineId) : []
    apply([upsert('routines', [routine]), remove('routine_items', old.filter((o) => !keep.has(o.id)).map((o) => o.id)), upsert('routine_items', items)])
    toast(`${name} 루틴을 저장했어요`)
    navigate('/workout')
  }

  const deleteRoutine = () => {
    if (!routineId) return
    const routine = db.routines.get(routineId)!
    const items = routineExercises(db, routineId)
    apply([remove('routine_items', items.map((i) => i.id)), remove('routines', [routineId])])
    toast(`${routine.name} 루틴을 지웠어요`, () => apply([upsert('routines', [routine]), upsert('routine_items', items)]))
    const next = routines.find((r) => r.id !== routineId)?.id ?? null
    select(next)
  }

  return (
    <>
      <BackButton to="/workout" label="운동" />
      <h1>루틴 편집</h1>
      <div className="chips" role="group" aria-label="내 루틴">
        {routines.map((r) => (
          <button key={r.id} type="button" className={'chip' + (routineId === r.id ? ' on' : '')} aria-pressed={routineId === r.id} onClick={() => select(r.id)}>
            {r.name}
          </button>
        ))}
        <button type="button" className={'chip' + (routineId === null ? ' on' : '')} aria-pressed={routineId === null} onClick={() => select(null)}>
          + 새 루틴
        </button>
      </div>

      <label className="field-label">
        <span className="muted">루틴 이름</span>
        <input className="field" placeholder="예: 가슴·삼두" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </label>

      <div className="section-title">
        <h2>운동 순서와 세트 수</h2>
        <span className="muted">
          {form.items.length}종목 · {total}세트
        </span>
      </div>
      <section className="card" style={{ gap: 0, padding: '4px 12px' }}>
        {!form.items.length && <p className="muted" style={{ padding: '12px 0' }}>아래에서 운동을 추가해 주세요.</p>}
        {form.items.map((it, i) => {
          const ex = db.exercises.get(it.exerciseId)
          return (
            <div key={(it.id ?? '') + it.exerciseId + i} className="list-item" style={{ gap: 6 }}>
              <div className="stack-sm" style={{ gap: 0 }}>
                <button type="button" className="icon-btn" style={{ height: 30 }} aria-label={`${ex?.name} 위로`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <Icon name="up" />
                </button>
                <button type="button" className="icon-btn" style={{ height: 30 }} aria-label={`${ex?.name} 아래로`} disabled={i === form.items.length - 1} onClick={() => move(i, 1)}>
                  <Icon name="down" />
                </button>
              </div>
              <span className="grow">
                <span className="strong" style={{ display: 'block' }}>
                  {ex?.name ?? '지워진 운동'}
                </span>
                <span className="muted">{ex ? `${ex.body_part} · ${ex.equipment}` : ''}</span>
              </span>
              <span className="stepper" role="group" aria-label={`${ex?.name} 세트 수`}>
                <button type="button" aria-label="세트 줄이기" disabled={it.sets <= 1} onClick={() => setItems((items) => items.map((x, k) => (k === i ? { ...x, sets: x.sets - 1 } : x)))}>
                  −
                </button>
                <span>{it.sets}세트</span>
                <button type="button" aria-label="세트 늘리기" disabled={it.sets >= 10} onClick={() => setItems((items) => items.map((x, k) => (k === i ? { ...x, sets: x.sets + 1 } : x)))}>
                  +
                </button>
              </span>
              <button type="button" className="icon-btn" aria-label={`${ex?.name} 빼기`} onClick={() => setItems((items) => items.filter((_, k) => k !== i))}>
                <Icon name="close" />
              </button>
            </div>
          )
        })}
      </section>
      <button type="button" className="btn btn-ghost" onClick={() => setPicking(true)}>
        + 운동 추가
      </button>
      <p className="muted">무게와 횟수는 루틴에 적지 않아요. 기록할 때 지난번 값이 자동으로 채워져요. 루틴은 적어 둔 순서대로 돌아가며 "다음 차례"가 정해져요.</p>
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn btn-primary" onClick={save}>
        저장
      </button>
      {routineId && (
        <button type="button" className="btn btn-quiet btn-danger" onClick={deleteRoutine}>
          이 루틴 지우기
        </button>
      )}

      {picking && (
        <ExercisePicker
          multiple
          onCancel={() => setPicking(false)}
          onDone={(picked) => {
            setItems((items) => [...items, ...picked.filter((id) => id !== RUN_EXERCISE_ID).map((exerciseId) => ({ exerciseId, sets: 3 }))])
            setPicking(false)
          }}
        />
      )}
    </>
  )
}

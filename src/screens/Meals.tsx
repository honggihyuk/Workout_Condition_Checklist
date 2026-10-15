// 식단: 끼니별 사진 올리기, 직접 입력(메뉴·양·칼로리·단백질), 메모, 오늘 합계 (3차 3-3, U2·U9)
// MVP에서는 AI 분석 없이 사진만 올려도 식사 칸이 채워지고, 칼로리는 알면 직접 적습니다 (docs/06-build.md 1-2)
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'
import { Photo, useDateParam } from '../components/ui'
import { longLabel, nowTime } from '../lib/dates'
import { ALL_SLOTS, dayOf, fmtNum, slotLabel } from '../lib/domain'
import { ids } from '../lib/ids'
import { photoPath } from '../lib/data/repo'
import { shrinkPhoto } from '../lib/photo'
import { remove, upsert, useStore } from '../lib/store'
import type { Meal, MealSlot } from '../lib/types'
import { limits, num, rangeError } from '../lib/validate'

function blankMeal(date: string, slot: MealSlot): Meal {
  return {
    id: ids.meal(date, slot),
    date,
    slot,
    eaten_at: null,
    photo_path: null,
    status: 'empty',
    ai_menu: null,
    ai_kcal: null,
    ai_protein_g: null,
    manual_menu: null,
    manual_g: null,
    manual_kcal: null,
    manual_protein_g: null,
    memo: null,
  }
}

const kcalOf = (m: Meal) => m.manual_kcal ?? m.ai_kcal
const proteinOf = (m: Meal) => m.manual_protein_g ?? m.ai_protein_g
const menuOf = (m: Meal) => m.manual_menu ?? m.ai_menu

export default function Meals() {
  const date = useDateParam()
  const [params] = useSearchParams()
  const { index, todayDate } = useStore()
  const d = dayOf(index, date)
  const confirmed = ALL_SLOTS.map((s) => d.meals[s]).filter((m): m is Meal => !!m && m.status === 'confirmed')
  const kcal = confirmed.reduce((a, m) => a + (kcalOf(m) ?? 0), 0)
  const protein = confirmed.reduce((a, m) => a + (proteinOf(m) ?? 0), 0)

  const slot = params.get('slot')
  useEffect(() => {
    if (slot) document.getElementById('meal-' + slot)?.scrollIntoView({ block: 'start' })
  }, [slot])

  return (
    <>
      <div className="stack-sm">
        <h1>식단</h1>
        <span className="muted">{longLabel(date)}</span>
        {date !== todayDate && (
          <Link to="/meals" className="btn-link small">
            오늘로 돌아가기
          </Link>
        )}
      </div>
      <div className="card">
        <span className="muted">{date === todayDate ? '오늘' : '이날'} 합계 (확인한 끼니)</span>
        {confirmed.length ? (
          <span className="big-num" style={{ fontSize: '1.4rem' }}>
            {fmtNum(kcal, 0)}
            <span className="unit"> kcal · 단백질 {fmtNum(protein, 0)}g</span>
          </span>
        ) : (
          <span className="muted">칼로리를 적은 끼니가 아직 없어요</span>
        )}
      </div>
      {ALL_SLOTS.map((s) => (
        <MealCard key={s} date={date} slot={s} meal={d.meals[s]} />
      ))}
    </>
  )
}

function MealCard({ date, slot, meal }: { date: string; slot: MealSlot; meal?: Meal }) {
  const { apply, repo, todayDate } = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const blob = await shrinkPhoto(file)
      const base = meal ?? blankMeal(date, slot)
      const path = photoPath(date, `${base.id}-${Date.now().toString(36)}`)
      await repo.putPhoto(path, blob)
      apply([
        upsert('meals', [
          {
            ...base,
            photo_path: path,
            status: base.status === 'confirmed' ? 'confirmed' : 'uploaded',
            eaten_at: base.eaten_at ?? (date === todayDate ? nowTime() : null),
          },
        ]),
      ])
      if (meal?.photo_path) void repo.removePhoto(meal.photo_path)
    } catch (e) {
      setError('사진을 올리지 못했어요. 다시 시도해 주세요. ' + (e instanceof Error ? `(${e.message})` : ''))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const deleteMeal = () => {
    if (!meal) return
    let undone = false
    apply([remove('meals', [meal.id])])
    setEditing(false)
    toast(`${slotLabel[slot]} 기록을 지웠어요`, () => {
      undone = true
      apply([upsert('meals', [meal])])
    })
    // 되돌리기 시간이 지나면 사진도 지움
    if (meal.photo_path)
      window.setTimeout(() => {
        if (!undone) void repo.removePhoto(meal.photo_path!)
      }, 7000)
  }

  const badge = !meal ? (
    <span className="muted">미기록{slot === 'snack' ? ' · 선택' : ''}</span>
  ) : meal.status === 'confirmed' ? (
    <span className="badge badge-good">확인함</span>
  ) : (
    <span className="badge badge-muted">사진만</span>
  )

  // 사진 고르기: 카메라·앨범 중 고르기 (U9, capture를 두지 않아 아이폰이 선택지를 보여 줌)
  const fileInput = (
    <input ref={fileRef} type="file" accept="image/*" className="sr" tabIndex={-1} onChange={(e) => void onFile(e.target.files?.[0])} />
  )
  const pickPhoto = () => fileRef.current?.click()

  return (
    <section id={'meal-' + slot} className="card" aria-label={slotLabel[slot]}>
      {fileInput}
      <div className="row between">
        <h2>
          {slotLabel[slot]} {meal?.eaten_at && <span className="muted">{meal.eaten_at}</span>}
        </h2>
        {badge}
      </div>
      {meal?.photo_path && <Photo path={meal.photo_path} alt={`${slotLabel[slot]} 사진`} />}
      {uploading && <p className="muted">사진을 줄여서 올리는 중…</p>}
      {error && <p className="error">{error}</p>}

      {!editing && meal?.status === 'confirmed' && (
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div className="stack-sm" style={{ gap: 2 }}>
            {menuOf(meal) && <span className="strong">{menuOf(meal)}</span>}
            <span className="small">
              {[
                kcalOf(meal) != null ? `${fmtNum(kcalOf(meal)!, 0)} kcal` : null,
                proteinOf(meal) != null ? `단백질 ${fmtNum(proteinOf(meal)!, 0)}g` : null,
                meal.manual_g != null ? `${fmtNum(meal.manual_g, 0)}g` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {meal.memo && <span className="muted">{meal.memo}</span>}
          </div>
          <button type="button" className="btn btn-link small" onClick={() => setEditing(true)}>
            수정 · 메모
          </button>
        </div>
      )}
      {!editing && meal && meal.status !== 'confirmed' && (
        <>
          <p className="muted">사진은 저장됐어요. 칼로리를 알면 적어 주세요.</p>
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            칼로리·메뉴 적기
          </button>
        </>
      )}
      {!editing && !meal && (
        <div className="grid2">
          <button type="button" className="btn btn-ghost" disabled={uploading} onClick={pickPhoto}>
            <Icon name="camera" /> 사진 올리기
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setEditing(true)}>
            사진 없이 적기
          </button>
        </div>
      )}
      {editing && (
        <MealForm
          date={date}
          slot={slot}
          meal={meal}
          onClose={() => setEditing(false)}
          onPickPhoto={pickPhoto}
          onDelete={meal ? deleteMeal : undefined}
        />
      )}
    </section>
  )
}

function MealForm({
  date,
  slot,
  meal,
  onClose,
  onPickPhoto,
  onDelete,
}: {
  date: string
  slot: MealSlot
  meal?: Meal
  onClose: () => void
  onPickPhoto: () => void
  onDelete?: () => void
}) {
  const { apply, todayDate } = useStore()
  const s = (n: number | null | undefined) => (n == null ? '' : String(n))
  const [f, setF] = useState({
    time: meal?.eaten_at ?? (date === todayDate ? nowTime() : ''),
    menu: meal ? (menuOf(meal) ?? '') : '',
    g: s(meal?.manual_g),
    kcal: s(meal ? kcalOf(meal) : null),
    protein: s(meal ? proteinOf(meal) : null),
    memo: meal?.memo ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((cur) => ({ ...cur, [k]: e.target.value }))

  const save = () => {
    const g = num(f.g)
    const kcal = num(f.kcal)
    const protein = num(f.protein)
    const err =
      rangeError('양', g, limits.mealGram, { unit: 'g' }) ??
      rangeError('칼로리', kcal, limits.mealKcal, { unit: 'kcal' }) ??
      rangeError('단백질', protein, limits.mealProtein, { unit: 'g' })
    if (err) return setError(err)
    const menu = f.menu.trim() || null
    const hasContent = !!menu || g != null || kcal != null || protein != null
    if (!meal?.photo_path && !hasContent) return setError('사진을 올리거나 메뉴·칼로리 중 하나를 적어 주세요')
    const base = meal ?? blankMeal(date, slot)
    apply([
      upsert('meals', [
        {
          ...base,
          eaten_at: /^\d{2}:\d{2}$/.test(f.time) ? f.time : null,
          manual_menu: menu,
          manual_g: g,
          manual_kcal: kcal,
          manual_protein_g: protein,
          memo: f.memo.trim() || null,
          status: hasContent ? 'confirmed' : base.photo_path ? 'uploaded' : 'empty',
        },
      ]),
    ])
    onClose()
  }

  return (
    <div className="stack">
      <div className="grid2">
        <label className="field-label">
          <span className="muted">시간</span>
          <input className="field" type="time" value={f.time} onChange={set('time')} />
        </label>
        <label className="field-label">
          <span className="muted">양 (g)</span>
          <input className="field" inputMode="numeric" placeholder="선택" value={f.g} onChange={set('g')} />
        </label>
        <label className="field-label">
          <span className="muted">칼로리 (kcal)</span>
          <input className="field" inputMode="numeric" placeholder="선택" value={f.kcal} onChange={set('kcal')} />
        </label>
        <label className="field-label">
          <span className="muted">단백질 (g)</span>
          <input className="field" inputMode="numeric" placeholder="선택" value={f.protein} onChange={set('protein')} />
        </label>
      </div>
      <label className="field-label">
        <span className="muted">메뉴</span>
        <input className="field" placeholder="예: 연어 포케" value={f.menu} onChange={set('menu')} />
      </label>
      <label className="field-label">
        <span className="muted">메모</span>
        <input className="field" placeholder="선택" value={f.memo} onChange={set('memo')} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn btn-primary" onClick={save}>
        저장
      </button>
      <div className="row between">
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          취소
        </button>
        <span className="row-sm">
          <button type="button" className="btn btn-quiet" onClick={onPickPhoto}>
            {meal?.photo_path ? '사진 바꾸기' : '사진 올리기'}
          </button>
          {onDelete && (
            <button type="button" className="btn btn-quiet btn-danger" onClick={onDelete}>
              지우기
            </button>
          )}
        </span>
      </div>
    </div>
  )
}

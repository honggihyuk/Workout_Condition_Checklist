// 운동 홈: 내 루틴으로 시작(다음 차례), 지난 운동 그대로, 운동 골라서 시작, 최근 운동 (5차 목업 v2)
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { longLabel, shortLabel } from '../lib/dates'
import {
  dayOf,
  daySummary,
  fmtDuration,
  fmtNum,
  lastSession,
  recentWorkoutDays,
  routineExercises,
  routineRotation,
  volumeOf,
  type DaySummary,
} from '../lib/domain'
import { useStore } from '../lib/store'

function summaryLine(s: DaySummary) {
  const parts: string[] = []
  if (s.setCount) parts.push(`${s.exerciseCount}종목 · ${s.setCount}세트 · 볼륨 ${fmtNum(s.volume, 0)}kg`)
  for (const r of s.runs) parts.push(`${fmtNum(r.distance_km)}km${r.duration_sec ? ' · ' + fmtDuration(r.duration_sec) : ''}`)
  return parts.join(' / ')
}

export default function Workout() {
  const { index, db, todayDate } = useStore()
  const navigate = useNavigate()
  const { list, next } = routineRotation(index, db)
  const todaySummary = daySummary(index, db, todayDate)
  const recent = recentWorkoutDays(index, db, 3, todayDate)
  const ordered = next ? [list.find((r) => r.routine.id === next.id)!, ...list.filter((r) => r.routine.id !== next.id)] : list

  return (
    <>
      <div className="stack-sm">
        <h1>운동</h1>
        <span className="muted">{longLabel(todayDate)}</span>
      </div>

      {todaySummary && <TodayResult summary={todaySummary} />}

      <div className="section-title">
        <h2>{todaySummary ? '루틴 더 하기' : '내 루틴으로 시작'}</h2>
        <Link to="/workout/routines" className="btn-link small">
          루틴 편집
        </Link>
      </div>
      {!list.length && (
        <div className="card">
          <p className="muted">루틴이 없어요. 루틴을 만들면 순서대로 "다음 차례"가 정해져요.</p>
          <Link to="/workout/routines?new=1" className="btn btn-ghost">
            루틴 만들기
          </Link>
        </div>
      )}
      {ordered.map(({ routine, lastDate }) => {
        const items = routineExercises(db, routine.id)
        const isNext = next?.id === routine.id
        return (
          <button
            key={routine.id}
            type="button"
            className={'card routine-card' + (isNext && !todaySummary ? ' next' : '')}
            onClick={() => navigate(`/workout/log?routine=${routine.id}`)}
          >
            <div className="row between">
              <span className="strong" style={{ fontSize: '1.05rem' }}>
                {routine.name}
              </span>
              {isNext && <span className="badge badge-good">다음 차례</span>}
            </div>
            <span className="small">{items.map((it) => db.exercises.get(it.exercise_id)?.name ?? '').join(' · ') || '운동 없음'}</span>
            <span className="muted">
              {items.length}종목{lastDate ? ` · 마지막 ${shortLabel(lastDate)}` : ' · 아직 안 함'}
            </span>
          </button>
        )
      })}
      <div className="grid2">
        <button type="button" className="btn btn-ghost" disabled={!recent.length} onClick={() => navigate('/workout/log?repeat=last')}>
          지난 운동 그대로
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/workout/log?pick=1')}>
          운동 골라서 시작
        </button>
      </div>

      {recent.length > 0 && (
        <section className="card" aria-label="최근 운동" style={{ gap: 0 }}>
          <h2 style={{ marginBottom: 4 }}>최근 운동</h2>
          {recent.map((s) => (
            <Link key={s.date} to={`/workout/log?date=${s.date}`} className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="muted" style={{ width: '2.8rem' }}>
                {shortLabel(s.date)}
              </span>
              <span className="grow">
                <span className="strong" style={{ display: 'block' }}>
                  {s.routineName ?? (s.setCount ? '운동' : '러닝')}
                </span>
                <span className="muted">{summaryLine(s)}</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <Link to="/workout/exercises" className="card card-link">
        <div className="row">
          <Icon name="chart" size={22} />
          <div className="grow">
            <div className="strong">운동별 기록 보기</div>
            <div className="muted">운동마다 최근 5회 흐름</div>
          </div>
          <Icon name="right" />
        </div>
      </Link>
    </>
  )
}

/** 저장한 오늘 운동 요약과 지난번 대비 (3차 3-2 저장 완료) */
function TodayResult({ summary }: { summary: DaySummary }) {
  const { index, db, todayDate } = useStore()
  const d = dayOf(index, todayDate)
  const byEx = new Map<string, typeof d.sets>()
  for (const s of d.sets) byEx.set(s.exercise_id, [...(byEx.get(s.exercise_id) ?? []), s])
  return (
    <section className="card" aria-label="오늘 운동">
      <div className="row between">
        <h2>오늘 운동 {summary.routineName && <span className="muted">{summary.routineName}</span>}</h2>
        <Link to={`/workout/log?date=${todayDate}`} className="chip" style={{ textDecoration: 'none' }}>
          수정
        </Link>
      </div>
      <span className="muted">{summaryLine(summary)}</span>
      <div className="stack-sm">
        {[...byEx].map(([exId, sets]) => {
          const vol = volumeOf(sets)
          const prev = lastSession(index, exId, todayDate)
          const diff = prev ? vol - prev.volume : null
          return (
            <div key={exId} className="row between small">
              <span>{db.exercises.get(exId)?.name ?? '운동'}</span>
              <span>
                {fmtNum(vol, 0)}kg{' '}
                {diff == null ? (
                  <span className="muted">첫 기록</span>
                ) : (
                  <span className={diff >= 0 ? 'accent-text strong' : 'muted'}>
                    {diff >= 0 ? '+' : '−'}
                    {fmtNum(Math.abs(diff), 0)}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

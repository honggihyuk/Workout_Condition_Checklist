import { describe, expect, it } from 'vitest'
import { toDB } from './data/repo'
import { buildIndex } from './domain'
import { ids } from './ids'
import { dayNutrition, gymKcal, proteinGap, runKcal, weightOn } from './nutrition'
import type { Meal, Tables } from './types'

const D = '2026-10-15'
const meal = (slot: Meal['slot'], kcal: number | null, protein: number | null, photo = true): Meal => ({
  id: ids.meal(D, slot),
  date: D,
  slot,
  eaten_at: null,
  photo_path: photo ? `${D}/${slot}.jpg` : null,
  status: kcal != null || protein != null ? 'confirmed' : 'uploaded',
  ai_menu: null,
  ai_kcal: null,
  ai_protein_g: null,
  manual_menu: null,
  manual_g: null,
  manual_kcal: kcal,
  manual_protein_g: protein,
  memo: null,
})
const make = (rows: Partial<{ [K in keyof Tables]: Tables[K][] }>) => buildIndex(toDB(rows))

describe('단백질 목표와 칼로리 비교', () => {
  it('체중은 그날 또는 그 전 마지막 기록', () => {
    const index = make({ body_weights: [{ id: 'a', date: '2026-10-12', weight_kg: 76.4 }, { id: 'b', date: '2026-10-16', weight_kg: 75 }] })
    expect(weightOn(index, D)).toBe(76.4)
    expect(weightOn(index, '2026-10-16')).toBe(75)
    expect(weightOn(index, '2026-10-01')).toBeNull()
  })

  it('단백질 목표는 체중 × 1.5~2g, 숫자 없는 끼니는 합계에서 빠지고 따로 셈', () => {
    const index = make({
      body_weights: [{ id: 'w', date: D, weight_kg: 76 }],
      meals: [meal('breakfast', 520, 38), meal('lunch', null, null), meal('dinner', 640, 32)],
    })
    const n = dayNutrition(index, D)
    expect(n.protein).toEqual({ min: 114, max: 152 })
    expect(n.intake).toEqual({ kcal: 1160, protein: 70, counted: 2, missing: 1 })
    expect(proteinGap(70, n.protein!)).toEqual({ state: 'under', grams: 44 })
    expect(proteinGap(130, n.protein!).state).toBe('in')
    expect(proteinGap(160, n.protein!)).toEqual({ state: 'over', grams: 8 })
  })

  it('운동 칼로리: 러닝은 체중 × 거리, 헬스는 세트 수로 시간을 어림잡고 강도로 MET를 고름', () => {
    expect(runKcal({ distance_km: 5 }, 76)).toBe(380)
    expect(gymKcal(13, 4, 76)).toBeCloseTo(5 * 76 * 0.65)
    expect(gymKcal(13, 2, 76)).toBeCloseTo(2.5 * 76 * 0.65)
    expect(gymKcal(13, null, 76)).toBeCloseTo(4 * 76 * 0.65)
  })

  it('쓴 칼로리 = 기초대사량(인바디 우선) × 1.2 + 운동', () => {
    const base = {
      body_weights: [{ id: 'w', date: D, weight_kg: 76 }],
      runs: [{ id: 'r', date: D, distance_km: 5, duration_sec: 1650, memo: null }],
    }
    const withInbody = dayNutrition(make({ ...base, inbody: [{ id: 'i', date: '2026-10-06', skeletal_muscle_kg: 34, body_fat_pct: 16, body_fat_kg: null, bmr_kcal: 1712 }] }), D)
    expect(withInbody.burn?.bmrFromInbody).toBe(true)
    expect(withInbody.burn?.total).toBeCloseTo(1712 * 1.2 + 380)
    const noInbody = dayNutrition(make(base), D)
    expect(noInbody.burn?.bmrFromInbody).toBe(false)
    expect(noInbody.burn?.bmr).toBe(76 * 24)
  })

  it('체중도 인바디도 없으면 목표와 비교 없이 먹은 양만', () => {
    const n = dayNutrition(make({ meals: [meal('breakfast', 520, 38)] }), D)
    expect(n.protein).toBeNull()
    expect(n.burn).toBeNull()
    expect(n.exercise).toBeNull()
    expect(n.intake.kcal).toBe(520)
  })
})

import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Today from './screens/Today'
import Calendar from './screens/Calendar'
import Workout from './screens/Workout'
import Meals from './screens/Meals'
import Body from './screens/Body'
import Settings from './screens/Settings'

// 탭 5개 구성: docs/03-ux-ia-design.md 1-2장
const tabs = [
  { to: '/today', label: '오늘' },
  { to: '/workout', label: '운동' },
  { to: '/meals', label: '식단' },
  { to: '/body', label: '몸 변화' },
  { to: '/settings', label: '설정' },
]

export default function App() {
  return (
    <div className="app">
      <main className="screen">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/body" element={<Body />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="주요 메뉴">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className="tab">
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

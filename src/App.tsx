import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Today from './screens/Today'
import Calendar from './screens/Calendar'
import Workout from './screens/Workout'
import Meals from './screens/Meals'
import Body from './screens/Body'
import Settings from './screens/Settings'
import TabIcon, { type TabIconName } from './components/TabIcon'

// 탭 5개 구성: docs/03-ux-ia-design.md 1-2장
const tabs: { to: string; label: string; icon: TabIconName }[] = [
  { to: '/today', label: '오늘', icon: 'today' },
  { to: '/workout', label: '운동', icon: 'workout' },
  { to: '/meals', label: '식단', icon: 'meals' },
  { to: '/body', label: '몸 변화', icon: 'body' },
  { to: '/settings', label: '설정', icon: 'settings' },
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
            <TabIcon name={tab.icon} />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

// 5차 UI 디자인(프레임 목업 → UI 의사결정 → 테마 선택) 검수가 끝나면 화면별로 구현합니다.
export default function Placeholder({ title, goal }: { title: string; goal: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>{goal}</p>
    </section>
  )
}

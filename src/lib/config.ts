// 어느 저장소를 쓸지: Supabase 주소·키가 있으면 실제 서버, VITE_DATA_MODE=demo(검수판)면 체험판.
// 개발 중(npm run dev)에 서버 값이 없으면 체험판으로 열고,
// 배포용 빌드에 서버 값이 빠졌으면 체험판으로 열지 않고 설정이 빠졌다고 알립니다 (대표님 기록이 체험판에 쌓이지 않게).
export const supabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY
export const isDemo = import.meta.env.VITE_DATA_MODE === 'demo' || (!supabaseConfigured && import.meta.env.DEV)
export const missingServerConfig = !isDemo && !supabaseConfigured

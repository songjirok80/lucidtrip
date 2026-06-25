import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'flag-icons/css/flag-icons.min.css' // 국기 SVG (앱에 포함, 오프라인 OK)
import 'pretendard/dist/web/variable/pretendardvariable.css' // Pretendard 폰트 (앱에 포함)
import './index.css'
import App from './App.jsx'
import { setupBackToExit } from './backToExit'

// 뒤로가기 두 번 종료 핸들러를 앱 로드 즉시 설정 (켜자마자 첫 뒤로가기도 잡히도록)
setupBackToExit()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

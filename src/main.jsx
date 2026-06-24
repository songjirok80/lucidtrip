import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'flag-icons/css/flag-icons.min.css' // 국기 SVG (앱에 포함, 오프라인 OK)
import 'pretendard/dist/web/variable/pretendardvariable.css' // Pretendard 폰트 (앱에 포함)
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 새 버전이 나오면 조용히 알아서 갱신
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon-192.png', 'pwa-icon-512.png'],
      // 설치 정보 (앱 이름, 색, 아이콘 등)
      manifest: {
        id: '/',
        name: 'LucidTrip — 여행 환율 계산기',
        short_name: 'LucidTrip',
        description: 'The Lucid Standard for Every Trip. 오프라인에서도 계산돼요.',
        lang: 'ko',
        theme_color: '#0ea5a4',
        background_color: '#ffffff',
        display: 'standalone', // 주소창 없이 앱처럼. 상태바는 theme-color로 배경과 맞춤(검정 띠 방지)
        start_url: '/',
        icons: [
          { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // 오프라인용으로 미리 저장할 파일들 (국기 svg + 나라 배경 webp 포함)
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,webp,png}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      // 개발 서버에서도 동작 확인 가능하게 (정확한 테스트는 빌드본에서)
      devOptions: { enabled: true },
    }),
  ],
})

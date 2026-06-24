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
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      // 설치 정보 (앱 이름, 색, 아이콘 등)
      manifest: {
        name: 'LucidTrip — 여행 환율 계산기',
        short_name: 'LucidTrip',
        description: 'The Lucid Standard for Every Trip. 오프라인에서도 계산돼요.',
        lang: 'ko',
        theme_color: '#0ea5a4',
        background_color: '#ffffff',
        display: 'fullscreen', // 상태바·내비바까지 숨긴 완전 전체화면 (안드로이드)
        display_override: ['fullscreen', 'standalone'],
        start_url: '/',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      // 오프라인용으로 미리 저장할 파일들 (국기 svg + 나라 배경 webp 포함)
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,webp}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      // 개발 서버에서도 동작 확인 가능하게 (정확한 테스트는 빌드본에서)
      devOptions: { enabled: true },
    }),
  ],
})

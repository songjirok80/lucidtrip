// 설치된 앱(standalone/전체화면)에서 "뒤로가기 두 번 누르면 종료".
// 앱이 켜지자마자(React 마운트 전, main.jsx에서) 설정해야 첫 뒤로가기도 잡힌다.
// 첫 번째 뒤로가기 → 'lucid-exit-hint' 이벤트로 토스트 요청 + 더미 기록 재적재.
// 2초 내 두 번째 → 실제 종료.
export function setupBackToExit() {
  const installed =
    window.navigator.standalone === true ||
    (window.matchMedia && !window.matchMedia('(display-mode: browser)').matches)
  if (!installed) return

  window.history.pushState(null, '', window.location.href)
  let lastBack = 0

  window.addEventListener('popstate', () => {
    const now = Date.now()
    if (now - lastBack < 2000) {
      window.history.back() // 종료
      return
    }
    lastBack = now
    window.history.pushState(null, '', window.location.href)
    window.dispatchEvent(new CustomEvent('lucid-exit-hint'))
  })
}

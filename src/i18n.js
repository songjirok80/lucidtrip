// 아주 가벼운 다국어 — 기기 언어를 자동 감지해 'ko'/'en' 중 하나로 고정(새로고침 전까지).
// 토글 없음: 한국어 기기는 한글, 그 외는 영어로 보인다.

export const lang =
  (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en'

const STRINGS = {
  ko: {
    appTitle: 'LucidTrip — 여행 환율 계산기',
    searchPlaceholder: '나라·통화 검색 (예: 일본, 유로, USD)',
    favorites: '자주 쓰는 통화',
    all: '전체',
    noResults: '검색 결과가 없어요',
    loading: '환율을 불러오는 중…',
    error: '인터넷 연결을 확인해 주세요 · 환율을 불러오지 못했어요',
    offline: '오프라인',
    rateNote: (d) => `${d} 환율 기준`,
    removeCard: '이 통화 빼기',
    swap: '통화 순서 바꾸기',
    addCard: '통화 추가',
    exitHint: '한 번 더 누르면 종료됩니다',
  },
  en: {
    appTitle: 'LucidTrip — Travel Currency Converter',
    searchPlaceholder: 'Search country or currency (e.g. Japan, Euro, USD)',
    favorites: 'Frequently used',
    all: 'All',
    noResults: 'No results',
    loading: 'Loading exchange rates…',
    error: 'Check your connection · Couldn’t load rates',
    offline: 'Offline',
    rateNote: (d) => `Rates as of ${d}`,
    removeCard: 'Remove',
    swap: 'Swap order',
    addCard: 'Add currency',
    exitHint: 'Press back again to exit',
  },
}

// 현재 언어의 문구 묶음
export const t = STRINGS[lang]

// 날짜를 언어에 맞게 (ko: "2026. 06. 24", en: "Jun 24, 2026")
export function formatDateStr(date) {
  if (lang === 'ko') {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}. ${m}. ${d}`
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// 문서 언어/제목도 맞춰준다 (한 번만)
document.documentElement.lang = lang
document.title = t.appTitle

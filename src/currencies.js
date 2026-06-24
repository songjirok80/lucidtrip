// 통화 코드 ↔ 한글 이름, 국기(나라 코드)를 다루는 도우미 모음.
// 한글 이름은 브라우저 내장 기능(Intl.DisplayNames)으로 자동으로 얻는다 → 표를 손으로 안 만들어도 됨.
import { PLACES } from './places'
import { lang } from './i18n'

const currencyNames = { ko: new Intl.DisplayNames(['ko'], { type: 'currency' }),
  en: new Intl.DisplayNames(['en'], { type: 'currency' }) }
const regionNames = { ko: new Intl.DisplayNames(['ko'], { type: 'region' }),
  en: new Intl.DisplayNames(['en'], { type: 'region' }) }

// 항상 위에 두는 고정 즐겨찾기 (엔트리 key 기준 — 나라는 id, 그 외 통화는 코드)
export const FAVORITES = ['KR', 'US', 'JP', 'FR']

// 통화코드 → 국기(나라코드, 소문자). 기본은 "앞 2글자"지만 예외만 따로 지정.
// null = 대표 국기가 없는 통화(아프리카 공통통화, IMF 등) → 중립 자리표시로 표시
const FLAG_OVERRIDES = {
  EUR: 'eu', // 유럽연합 깃발
  XAF: null, // 중앙아프리카 CFA 프랑
  XOF: null, // 서아프리카 CFA 프랑
  XCD: null, // 동카리브 달러
  XPF: null, // CFP 프랑
  XDR: null, // IMF 특별인출권
  ANG: null, // 네덜란드령 안틸레스 길더(폐지)
}

export function getFlagCode(code) {
  if (code in FLAG_OVERRIDES) return FLAG_OVERRIDES[code]
  return code.slice(0, 2).toLowerCase()
}

export function getCurrencyName(code, locale = lang) {
  try {
    const name = currencyNames[locale].of(code)
    return name && name !== code ? name : code
  } catch {
    return code
  }
}

function getRegionName(code, locale = lang) {
  const flag = getFlagCode(code)
  if (!flag) return ''
  try {
    return regionNames[locale].of(flag.toUpperCase()) || ''
  } catch {
    return ''
  }
}

// 선택 목록의 한 항목(entry):
//   key    : 고유 식별자 (나라는 place.id 'DE', 그 외 통화는 코드 'AUD')
//   kind   : 'place' | 'currency'
//   code   : 환율 계산용 통화 코드
//   place  : 배경/국기를 나라 기준으로 쓸 때의 place id (없으면 null)
//   flag   : 국기 코드
//   label  : 목록에 보일 이름 (나라명 또는 통화명)
//   search : 검색어 묶음(소문자)
//
// API 환율표(rates)에서 목록을 만든다:
//   1) 디자인된 30개 나라(PLACES) — 환율표에 통화가 있는 것만, 맨 위에
//   2) 나라로 따로 만들지 않은 나머지 통화들 (코드 알파벳순)
export function buildEntries(rates) {
  if (!rates) return []

  const placeEntries = PLACES.filter((p) => rates[p.code] != null).map((p) => ({
    key: p.id,
    kind: 'place',
    code: p.code,
    place: p.id,
    flag: p.flag,
    label: lang === 'ko' ? p.country : p.nameEn,
    // 검색: 한글 나라명 + 영어 나라명 + 별칭 + 통화코드 + 통화이름(한·영) — 어느 언어로 쳐도 잡힘
    search: `${p.country} ${p.nameEn} ${p.en} ${p.code} ${getCurrencyName(p.code, 'ko')} ${getCurrencyName(p.code, 'en')}`.toLowerCase(),
  }))

  // 나라로 이미 다룬 통화는 일반 통화 목록에서 빼서 중복을 막는다 (예: EUR, KRW…)
  const placeCodes = new Set(PLACES.map((p) => p.code))
  const currencyEntries = Object.keys(rates)
    .filter((code) => !placeCodes.has(code))
    .sort()
    .map((code) => {
      const nameKo = getCurrencyName(code, 'ko')
      const nameEn = getCurrencyName(code, 'en')
      return {
        key: code,
        kind: 'currency',
        code,
        place: null,
        flag: getFlagCode(code),
        label: lang === 'ko' ? nameKo : nameEn,
        search: `${code} ${nameKo} ${nameEn} ${getRegionName(code, 'ko')} ${getRegionName(code, 'en')}`.toLowerCase(),
      }
    })

  return [...placeEntries, ...currencyEntries]
}

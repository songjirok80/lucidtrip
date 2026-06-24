// 디자인된 30개 "나라" — 표시(국기·배경)는 나라 기준, 환율 계산은 통화(code) 기준.
// 같은 통화(EUR)를 여러 나라가 공유 → 나라마다 다른 배경/국기를 보여준다.
// 예: "독일" 선택 → 통화 EUR로 계산, 국기 🇩🇪, 배경 독일.
//     "유로"/"EUR" 검색 → 유로를 쓰는 나라들이 모두 나온다.
//
// id        : 고유 키(ISO 나라코드) — 배경 파일명(public/bg/<id>.webp)이자 국기 코드
// country   : 화면/검색에 쓰는 한글 나라 이름
// nameEn    : 화면에 쓰는 영어 나라 이름
// en        : 추가 영어 검색어(별칭, 공백 구분)
// code      : 환율 계산용 통화 코드 (open.er-api 기준)
// flag      : 국기 코드(flag-icons, 소문자) — 대부분 id와 같음

export const PLACES = [
  { id: 'KR', country: '한국', nameEn: 'South Korea', en: 'korea', code: 'KRW', flag: 'kr' },
  { id: 'JP', country: '일본', nameEn: 'Japan', en: '', code: 'JPY', flag: 'jp' },
  { id: 'VN', country: '베트남', nameEn: 'Vietnam', en: '', code: 'VND', flag: 'vn' },
  { id: 'CN', country: '중국', nameEn: 'China', en: '', code: 'CNY', flag: 'cn' },
  { id: 'CA', country: '캐나다', nameEn: 'Canada', en: '', code: 'CAD', flag: 'ca' },
  { id: 'DE', country: '독일', nameEn: 'Germany', en: 'deutschland', code: 'EUR', flag: 'de' },
  { id: 'ID', country: '인도네시아', nameEn: 'Indonesia', en: '', code: 'IDR', flag: 'id' },
  { id: 'US', country: '미국', nameEn: 'United States', en: 'usa america', code: 'USD', flag: 'us' },
  { id: 'MX', country: '멕시코', nameEn: 'Mexico', en: '', code: 'MXN', flag: 'mx' },
  { id: 'HK', country: '홍콩', nameEn: 'Hong Kong', en: '', code: 'HKD', flag: 'hk' },
  { id: 'PT', country: '포르투갈', nameEn: 'Portugal', en: '', code: 'EUR', flag: 'pt' },
  { id: 'MA', country: '모로코', nameEn: 'Morocco', en: '', code: 'MAD', flag: 'ma' },
  { id: 'IT', country: '이탈리아', nameEn: 'Italy', en: '', code: 'EUR', flag: 'it' },
  { id: 'NL', country: '네덜란드', nameEn: 'Netherlands', en: 'holland', code: 'EUR', flag: 'nl' },
  { id: 'GR', country: '그리스', nameEn: 'Greece', en: '', code: 'EUR', flag: 'gr' },
  { id: 'HR', country: '크로아티아', nameEn: 'Croatia', en: '', code: 'EUR', flag: 'hr' },
  { id: 'FR', country: '프랑스', nameEn: 'France', en: '', code: 'EUR', flag: 'fr' },
  { id: 'TH', country: '태국', nameEn: 'Thailand', en: '', code: 'THB', flag: 'th' },
  { id: 'SG', country: '싱가포르', nameEn: 'Singapore', en: '', code: 'SGD', flag: 'sg' },
  { id: 'MY', country: '말레이시아', nameEn: 'Malaysia', en: '', code: 'MYR', flag: 'my' },
  { id: 'CZ', country: '체코', nameEn: 'Czechia', en: 'czech', code: 'CZK', flag: 'cz' },
  { id: 'TR', country: '튀르키예', nameEn: 'Türkiye', en: 'turkey', code: 'TRY', flag: 'tr' },
  { id: 'SA', country: '사우디아라비아', nameEn: 'Saudi Arabia', en: '', code: 'SAR', flag: 'sa' },
  { id: 'AT', country: '오스트리아', nameEn: 'Austria', en: '', code: 'EUR', flag: 'at' },
  { id: 'PL', country: '폴란드', nameEn: 'Poland', en: '', code: 'PLN', flag: 'pl' },
  { id: 'ES', country: '스페인', nameEn: 'Spain', en: '', code: 'EUR', flag: 'es' },
  { id: 'GB', country: '영국', nameEn: 'United Kingdom', en: 'uk britain england', code: 'GBP', flag: 'gb' },
  { id: 'IN', country: '인도', nameEn: 'India', en: '', code: 'INR', flag: 'in' },
  { id: 'RU', country: '러시아', nameEn: 'Russia', en: '', code: 'RUB', flag: 'ru' },
  { id: 'EG', country: '이집트', nameEn: 'Egypt', en: '', code: 'EGP', flag: 'eg' },
]

// id → place 빠른 조회
export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]))

// 배경 이미지 주소 (public/bg/<id>.webp). 배포 경로(BASE_URL) 고려.
export function bgUrl(id) {
  return `${import.meta.env.BASE_URL}bg/${id}.webp`
}

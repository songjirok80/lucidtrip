// 배경/제목 색 담당.
// - 디자인된 30개 나라(place): 피그마에서 내보낸 이미지(public/bg/<id>.webp)를 배경으로,
//   제목 색은 그 이미지에서 대표색을 샘플링해 만든다.
// - 그 외 통화: 국기 SVG에서 대표색(70%)+둘째색(30%)을 자동 추출해 부드러운 블롭 그라데이션 생성.
import { getFlagCode } from './currencies'
import { PLACE_BY_ID, bgUrl } from './places'

// 시안에서 정한 한국/일본/베트남 색 (대표색 + 둘째 색)
const PRESET = {
  KRW: { primary: { r: 42, g: 68, b: 216 }, secondary: { r: 239, g: 79, b: 134 } }, // 파랑 + 핑크
  JPY: { primary: { r: 236, g: 15, b: 63 }, secondary: null }, // 빨강
  VND: { primary: { r: 255, g: 32, b: 68 }, secondary: { r: 255, g: 215, b: 0 } }, // 빨강 + 노랑
}

// 추출 전/실패 시 기본 배경
export const DEFAULT_GRADIENT =
  'linear-gradient(160deg, #f7f8fc 0%, #aab2c8 55%, #5b6470 100%)'

const themeCache = {}
const colorCache = {}

// 직접 만든 배경(자주 가는 15개국 등): 통화코드별로 여기에 넣으면 자동/프리셋보다 우선 적용.
// 형식: USD: { bg: '<css 배경>', title: '<제목용 linear-gradient>', accent: '<+버튼 색 rgb/hex>' }
const CUSTOM = {}

// 씨앗 고정 난수기 — 통화마다 항상 같은(하지만 통화별로 다른) 블롭 배치
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 채도 boost + 밝기 보정 (rgb→hsl→rgb)
function vivid({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0, s = 0
  let l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h /= 6
  }
  s = Math.min(1, s * 1.5)
  l = Math.min(0.62, Math.max(0.4, l))
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  }
}

function lighten(c, amt) {
  return {
    r: Math.min(c.r + amt, 255),
    g: Math.min(c.g + amt, 255),
    b: Math.min(c.b + amt, 255),
  }
}

// 두 색으로 여러 개의 부드러운 원형 블롭을 흩뿌린 그라데이션 만들기
function buildGradient({ primary, secondary }) {
  const p = vivid(primary)
  const s = secondary ? vivid(secondary) : lighten(p, 70)
  const lightP = lighten(p, 95)
  const seed = ((p.r << 16) ^ (p.g << 8) ^ p.b ^ ((s.r << 10) + (s.g << 5) + s.b)) >>> 0
  const rnd = mulberry32(seed)
  const rgba = (c, a) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`

  // 블롭 하나 만들기 (위치는 주거나 랜덤, 모양/크기/투명도/번짐은 랜덤)
  const blob = (col, x, y) => {
    const px = x == null ? Math.round(rnd() * 100) : x
    const py = y == null ? Math.round(rnd() * 100) : y
    const alpha = (0.45 + rnd() * 0.35).toFixed(2)
    const fade = 50 + Math.round(rnd() * 18)
    // 모양 다양화: 정원 / 가로 넓은 타원 / 세로 타원을 섞는다
    let shape
    const kind = rnd()
    if (kind < 0.4) {
      const r = 150 + Math.round(rnd() * 280) // 정원 반지름 150~430px
      shape = `circle ${r}px`
    } else {
      const rx = 36 + Math.round(rnd() * 80) // 가로 반지름 36~116%
      const ry = 28 + Math.round(rnd() * 72) // 세로 반지름 28~100%
      shape = `${rx}% ${ry}%`
    }
    return `radial-gradient(${shape} at ${px}% ${py}%, ${rgba(col, alpha)} 0%, transparent ${fade}%)`
  }

  // 전체 방향(위 밝게 → 아래 대표색)은 살짝 유지하되, 블롭 위치는 랜덤하게 흩뿌림
  const blobs = [
    blob(lightP, Math.round(rnd() * 100), 5 + Math.round(rnd() * 30)), // 윗쪽 밝게
    blob(p, Math.round(rnd() * 100), 68 + Math.round(rnd() * 30)), // 아랫쪽 대표색
  ]
  if (secondary) blobs.push(blob(s)) // 둘째 색 강조
  const extra = secondary ? 3 : 4
  for (let i = 0; i < extra; i++) {
    const roll = rnd()
    const col = roll < 0.45 ? p : roll < 0.75 ? lightP : s
    blobs.push(blob(col))
  }

  const base = `linear-gradient(160deg, #f7f8fc 0%, ${rgba(p, 0.95)} 128%)`
  return blobs.join(',\n') + ',\n' + base
}

// 국기 SVG 주소를 computed style에서 꺼내기 ("마지막 )"까지 통째로)
function flagUrl(flagCode) {
  const span = document.createElement('span')
  span.className = `fi fi-${flagCode}`
  span.style.cssText = 'position:absolute;opacity:0;pointer-events:none'
  document.body.appendChild(span)
  const bg = getComputedStyle(span).backgroundImage
  document.body.removeChild(span)
  if (!bg || bg === 'none' || !bg.includes('url(')) return null
  const s = bg.slice(bg.indexOf('url(') + 4, bg.lastIndexOf(')'))
  return s.replace(/^["']|["']$/g, '')
}

// rgb → hue(0~1), saturation, lightness
function rgbToHsl(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h /= 6
  }
  return { h, s, l }
}

// 픽셀을 색상(hue)별로 묶어 대표색 + 색상이 충분히 다른 둘째 색 뽑기 (흰/회/검 제외)
function dominantColors(data) {
  const N = 18
  const w = new Array(N).fill(0)
  const rs = new Array(N).fill(0)
  const gs = new Array(N).fill(0)
  const bs = new Array(N).fill(0)
  let avgR = 0, avgG = 0, avgB = 0, avgN = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    avgR += r; avgG += g; avgB += b; avgN++
    const { h, s, l } = rgbToHsl(r, g, b)
    if (s < 0.2 || l < 0.12 || l > 0.9) continue
    const bin = Math.min(N - 1, Math.floor(h * N))
    w[bin] += s
    rs[bin] += r * s
    gs[bin] += g * s
    bs[bin] += b * s
  }
  const order = []
  for (let k = 0; k < N; k++) if (w[k] > 0) order.push(k)
  order.sort((a, b) => w[b] - w[a])
  if (order.length === 0) {
    const avg = { r: Math.round(avgR / avgN), g: Math.round(avgG / avgN), b: Math.round(avgB / avgN) }
    return { primary: avg, secondary: null }
  }
  const colorOf = (k) => ({
    r: Math.round(rs[k] / w[k]),
    g: Math.round(gs[k] / w[k]),
    b: Math.round(bs[k] / w[k]),
  })
  const p = order[0]
  let secondK = -1
  for (const k of order.slice(1)) {
    const dist = Math.min(Math.abs(k - p), N - Math.abs(k - p))
    if (dist >= 2) { secondK = k; break }
  }
  return { primary: colorOf(p), secondary: secondK === -1 ? null : colorOf(secondK) }
}

// 국기 이미지를 작은 캔버스에 그려 대표색 추출 (Promise<{primary, secondary}>)
function extractFlagColor(flagCode) {
  if (colorCache[flagCode]) return Promise.resolve(colorCache[flagCode])
  return new Promise((resolve) => {
    const url = flagCode ? flagUrl(flagCode) : null
    if (!url) {
      resolve({ primary: { r: 110, g: 120, b: 150 }, secondary: null })
      return
    }
    // data URI 안의 '#' 참조 때문에 잘리는 국기는 Blob으로 바꿔 안전하게 로드
    let src = url
    let blobUrl = null
    if (url.startsWith('data:image/svg+xml')) {
      const comma = url.indexOf(',')
      const head = url.slice(0, comma)
      let svg = url.slice(comma + 1)
      svg = head.includes('base64') ? atob(svg) : decodeURIComponent(svg)
      blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      src = blobUrl
    }
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 16
        canvas.height = 12
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, 16, 12)
        const data = ctx.getImageData(0, 0, 16, 12).data
        const color = dominantColors(data)
        colorCache[flagCode] = color
        resolve(color)
      } catch {
        resolve({ primary: { r: 110, g: 120, b: 150 }, secondary: null })
      } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
      }
    }
    img.onerror = () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      resolve({ primary: { r: 110, g: 120, b: 150 }, secondary: null })
    }
    img.src = src
  })
}

// 통화의 두 대표색 얻기 (프리셋이면 그 값, 아니면 국기에서 추출)
function colorsFor(code) {
  if (PRESET[code]) return Promise.resolve(PRESET[code])
  return extractFlagColor(getFlagCode(code))
}

// 제목 글자용: 두 색의 선명한 선형 그라데이션
function buildTitle({ primary, secondary }) {
  const p = vivid(primary)
  const s = secondary ? vivid(secondary) : lighten(p, 60)
  return `linear-gradient(110deg, rgb(${p.r}, ${p.g}, ${p.b}) 0%, rgb(${s.r}, ${s.g}, ${s.b}) 100%)`
}

// +버튼 등 강조색 (대표색)
function accentColor({ primary }) {
  const p = vivid(primary)
  return `rgb(${p.r}, ${p.g}, ${p.b})`
}

function themeFromColors(colors) {
  return {
    bg: buildGradient(colors),
    title: buildTitle(colors),
    accent: accentColor(colors),
    image: false,
  }
}

// 추출 전/실패 시 기본 테마
const DEFAULT_THEME = {
  bg: DEFAULT_GRADIENT,
  title: 'linear-gradient(110deg, #5b6470 0%, #aab2c8 100%)',
  accent: '#5b6470',
  image: false,
}

// 임의 이미지(배경 webp)를 작은 캔버스에 그려 대표색 추출 (Promise<{primary, secondary}>)
// 배경 이미지는 같은 출처(/bg/...)라 캔버스가 오염되지 않아 픽셀을 읽을 수 있다.
function extractImageColor(url) {
  if (colorCache[url]) return Promise.resolve(colorCache[url])
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const W = 24, H = 52
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, W, H)
        const data = ctx.getImageData(0, 0, W, H).data
        const color = dominantColors(data)
        colorCache[url] = color
        resolve(color)
      } catch {
        resolve({ primary: { r: 110, g: 120, b: 150 }, secondary: null })
      }
    }
    img.onerror = () => resolve({ primary: { r: 110, g: 120, b: 150 }, secondary: null })
    img.src = url
  })
}

// 나라(place) 테마: 배경은 이미지, 제목/강조색은 이미지에서 뽑은 색(없으면 기본)
function placeTheme(id, colors) {
  return {
    bg: `url("${bgUrl(id)}") center center / cover no-repeat`,
    title: colors ? buildTitle(colors) : DEFAULT_THEME.title,
    accent: colors ? accentColor(colors) : DEFAULT_THEME.accent,
    image: true,
  }
}

// 키 → 테마({bg, title, accent, image}) Promise.
// 키는 나라 id('DE') 또는 통화 코드('AUD'). 커스텀 > 나라 이미지 > 프리셋/자동
export function getTheme(key) {
  if (CUSTOM[key]) return Promise.resolve(CUSTOM[key])
  if (themeCache[key]) return Promise.resolve(themeCache[key])
  if (PLACE_BY_ID[key]) {
    return extractImageColor(bgUrl(key)).then((colors) => {
      const t = placeTheme(key, colors)
      themeCache[key] = t
      return t
    })
  }
  return colorsFor(key).then((colors) => {
    const t = themeFromColors(colors)
    themeCache[key] = t
    return t
  })
}

// 색의 밝기(0~1)
function luminance({ r, g, b }) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

// 이미지 배경의 윗부분(헤더가 놓이는 곳) 평균 밝기 → 어두우면 true (헤더 글씨를 흰색으로)
function imageTopDark(url) {
  const ck = 'topdark:' + url
  if (ck in colorCache) return Promise.resolve(colorCache[ck])
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const W = 24, H = 52
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, W, H)
        const topH = Math.max(1, Math.round(H * 0.22)) // 위 22%만(헤더 영역)
        const data = ctx.getImageData(0, 0, W, topH).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
        }
        const dark = luminance({ r: r / n, g: g / n, b: b / n }) < 0.6
        colorCache[ck] = dark
        resolve(dark)
      } catch {
        resolve(false)
      }
    }
    img.onerror = () => resolve(false)
    img.src = url
  })
}

function rgbToHex({ r, g, b }) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return '#' + h(r) + h(g) + h(b)
}

// 이미지의 특정 세로 구간(y0~y1, 0~1 비율) 평균 색 ({r,g,b}) — 상태바/내비바 색 맞춤용
function imageStripColor(url, y0f, y1f) {
  const ck = `strip:${y0f}-${y1f}:${url}`
  if (ck in colorCache) return Promise.resolve(colorCache[ck])
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const W = 24, H = 52
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, W, H)
        const y0 = Math.max(0, Math.round(H * y0f))
        const hh = Math.max(1, Math.round(H * y1f) - y0)
        const data = ctx.getImageData(0, y0, W, hh).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
        }
        const col = { r: r / n, g: g / n, b: b / n }
        colorCache[ck] = col
        resolve(col)
      } catch {
        resolve({ r: 244, g: 246, b: 251 })
      }
    }
    img.onerror = () => resolve({ r: 244, g: 246, b: 251 })
    img.src = url
  })
}

// 배경 맨 윗 가장자리 색(hex) — 상태바(theme-color)를 화면 최상단과 거의 일치시켜 띠가 안 보이게
export function getTopColor(key) {
  if (PLACE_BY_ID[key]) return imageStripColor(bgUrl(key), 0, 0.07).then(rgbToHex)
  return Promise.resolve('#f4f6fb') // 자동 생성 배경의 윗부분은 밝음
}

// 배경 바닥 대표 색(hex) — 하단 내비게이션 바 색을 여기에 맞춤
export function getBottomColor(key) {
  if (PLACE_BY_ID[key]) return imageStripColor(bgUrl(key), 0.84, 1).then(rgbToHex)
  return colorsFor(key).then(({ primary }) => rgbToHex(vivid(primary))) // 자동 배경 바닥은 대표색
}

// 배경 윗부분(헤더가 놓이는 곳)이 어두운가? → true면 헤더를 흰 글씨로
export function getHeaderDark(key) {
  if (PLACE_BY_ID[key]) return imageTopDark(bgUrl(key))
  return colorsFor(key).then(({ primary }) => {
    const p = vivid(primary)
    const W = 0.42 // 흰 바탕 42% + 대표색 58% 정도로 윗부분 색을 추정
    const top = {
      r: W * 247 + (1 - W) * p.r,
      g: W * 248 + (1 - W) * p.g,
      b: W * 252 + (1 - W) * p.b,
    }
    return luminance(top) < 0.6
  })
}

// 즉시 쓸 수 있는 테마 (깜빡임 방지용 — 배경은 바로, 색 샘플링은 getTheme이 마저 함)
export function getInitialTheme(key) {
  if (CUSTOM[key]) return CUSTOM[key]
  if (themeCache[key]) return themeCache[key]
  // 나라: 이미지 배경은 즉시 보여주고, 제목 색은 일단 기본(샘플링 끝나면 getTheme이 갱신)
  if (PLACE_BY_ID[key]) return placeTheme(key, null)
  if (PRESET[key]) {
    const t = themeFromColors(PRESET[key])
    themeCache[key] = t
    return t
  }
  return DEFAULT_THEME
}

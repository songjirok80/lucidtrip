import { useState, useEffect, useRef, useLayoutEffect, useMemo, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CurrencyPicker, { CurrencyPickerModal } from './CurrencyPicker'
import { buildEntries } from './currencies'
import { getTheme, getInitialTheme, getHeaderDark, getTopColor, getBottomColor } from './theme'
import { t, formatDateStr } from './i18n'
import './App.css'

// 통화별 소수점 자릿수 (없으면 기본 2자리)
const DECIMALS = {
  KRW: 0,
  JPY: 0,
  VND: 0,
}

// 진짜 환율을 받아올 주소 (USD 기준 "1달러 = 각 통화 얼마")
const API_URL = 'https://open.er-api.com/v6/latest/USD'

// 기기 안 저장 서랍(localStorage)에서 쓸 이름표
const STORAGE_KEY = 'triprate-rates'

// 서랍에서 저장된 환율 꺼내기 ({ rates, savedAt } 또는 없으면 null)
function loadCached() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data.rates || !data.savedAt) return null
    return data
  } catch {
    return null
  }
}

// 받아온 환율을 서랍에 저장 (환율표 + 그 환율의 날짜)
function saveCached(rates, savedAt) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rates, savedAt }))
  } catch {
    // 저장 공간이 막혀 있어도 앱은 그냥 동작
  }
}

// 마지막으로 보던 카드 구성(나라/통화)을 기억하는 이름표 — 금액은 저장 안 함(새로고침 시 0으로)
const SLOTS_KEY = 'triprate-slots'

// 기본 카드 (처음 켤 때)
const DEFAULT_SLOTS = [
  { id: 0, code: 'KRW', place: 'KR', flag: 'kr' },
  { id: 1, code: 'VND', place: 'VN', flag: 'vn' },
]

// 저장된 카드 구성 불러오기 (없거나 이상하면 기본값). id는 0부터 다시 매김.
function loadSlots() {
  try {
    const arr = JSON.parse(localStorage.getItem(SLOTS_KEY))
    if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_SLOTS
    return arr
      .filter((s) => s && s.code)
      .map((s, i) => ({ id: i, code: s.code, place: s.place ?? null, flag: s.flag ?? null }))
  } catch {
    return DEFAULT_SLOTS
  }
}

// from 통화 금액을 to 통화로 변환 (USD를 다리 삼아 계산)
function convert(amount, from, to, rates) {
  if (!rates || !isFinite(amount)) return 0
  const inUsd = amount / rates[from]
  return inUsd * rates[to]
}

// 입력 문자열에서 숫자만 뽑기 ("20,000,000" → 20000000)
function parseAmount(text) {
  const n = parseFloat(String(text).replace(/,/g, ''))
  return isFinite(n) ? n : 0
}

// 입력 중인 글자를 "숫자만 + 천 단위 쉼표" 형태로 정리 (계산값 아님)
function formatInput(text) {
  let s = String(text).replace(/[^\d.]/g, '')
  const dot = s.indexOf('.')
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '')
  }
  const [intPart, decPart] = s.split('.')
  const intFmt = intPart ? Number(intPart).toLocaleString('en-US') : ''
  if (s.includes('.')) return (intFmt || '0') + '.' + (decPart ?? '')
  return intFmt
}

// 계산 결과를 통화 규칙에 맞춰 쉼표 + 소수점 자릿수로 표시
function formatAmount(n, code) {
  if (!isFinite(n)) return '0'
  const digits = DECIMALS[code] ?? 2
  return n.toLocaleString('en-US', { maximumFractionDigits: digits })
}

// 통화 카드 한 장(유리 박스): 위에 국기+코드 선택, 아래에 금액. onRemove 있으면 ✕ 표시
// forwardRef 필수: AnimatePresence mode="popLayout"가 빠지는 카드를 측정해 흐름에서
// 빼내려면 카드 DOM에 ref를 붙일 수 있어야 함. ref를 안 넘기면 pop 못 해서 +버튼이 "틱"함.
const CurrencyCard = forwardRef(function CurrencyCard({
  code,
  flag,
  valueKey,
  entries,
  recents,
  onCurrencyChange,
  amount,
  onAmountChange,
  onRemove,
  anim,
}, ref) {
  const inputRef = useRef(null)

  // 화면에 그려진 직후, 금액 글자가 넘치면 글자 크기를 줄여 박스 안에 맞춘다
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    const MAX = 30
    const MIN = 16
    let size = MAX
    el.style.fontSize = MAX + 'px'
    while (el.scrollWidth > el.clientWidth && size > MIN) {
      size -= 1
      el.style.fontSize = size + 'px'
    }
  }, [amount])

  // 모바일: 입력 칸을 누르면 키보드가 올라온 뒤 그 칸을 화면 가운데로 스크롤(가림 방지)
  function handleFocus() {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 300)
  }

  return (
    <motion.div ref={ref} className="currency-card" {...anim}>
      {onRemove && (
        <button
          type="button"
          className="card-remove"
          onClick={onRemove}
          aria-label={t.removeCard}
        >
          <svg className="x-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
      <CurrencyPicker
        valueKey={valueKey}
        code={code}
        flag={flag}
        entries={entries}
        recents={recents}
        onChange={onCurrencyChange}
      />
      <input
        ref={inputRef}
        className="amount-input"
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        onFocus={handleFocus}
      />
    </motion.div>
  )
})

function App() {
  // 카드들을 {id, code(계산용 통화), place(표시용 나라 id|null), flag} 배열로 관리.
  // place가 있으면 그 나라의 배경/국기를 쓰고, 없으면 통화 코드 기준으로 자동 표시.
  const [slots, setSlots] = useState(loadSlots) // 마지막 본 나라 구성 복원
  const nextSlotId = useRef(slots.length)
  const [addOpen, setAddOpen] = useState(false) // 통화 추가 팝업 열림 여부
  const [activeIndex, setActiveIndex] = useState(0) // 마지막에 입력한 카드
  const [value, setValue] = useState('0') // 금액은 새로고침마다 0으로 시작(저장 안 함)

  // 카드 구성(나라/통화)이 바뀌면 저장 — 다음에 켤 때 그대로 복원 (금액은 제외)
  useEffect(() => {
    try {
      localStorage.setItem(
        SLOTS_KEY,
        JSON.stringify(slots.map((s) => ({ code: s.code, place: s.place, flag: s.flag }))),
      )
    } catch {
      // 저장 실패해도 앱은 그냥 동작
    }
  }, [slots])

  // 스왑 애니메이션 상태 (위치 이동은 layout이 처리, swapping은 입체 강조용)
  const [swapping, setSwapping] = useState(false)
  const swapTimer = useRef(null)

  // 환율 메모지 — 앱 켤 때 저장 서랍 값으로 즉시 시작(있으면 깜빡임 없음)
  const [rates, setRates] = useState(() => loadCached()?.rates ?? null)
  const [updatedAt, setUpdatedAt] = useState(() => {
    const c = loadCached()
    return c ? new Date(c.savedAt) : null
  })
  const [status, setStatus] = useState(() => (loadCached() ? 'ready' : 'loading'))
  // 저장분을 쓰는 중인지(=새 환율을 못 받아옴). 처음부터 오프라인이면 바로 true
  const [offline, setOffline] = useState(() => !navigator.onLine)

  // 최근 선택한 통화(기기에 저장)
  const [recents, setRecents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('triprate-recent')) || []
    } catch {
      return []
    }
  })

  // 배경+제목: 테마 레이어들을 쌓아 새 색/이미지를 위에 페이드인 → 스며들듯 전환
  const [bgLayers, setBgLayers] = useState(() => {
    const key = slots[0].place || slots[0].code
    const t = getInitialTheme(key)
    return [{ id: 0, bg: t.bg, title: t.title, image: !!t.image }]
  })
  const nextLayerId = useRef(1)

  // 배경 윗부분이 어두우면 헤더(태그라인)를 흰 글씨로 — 배경 때문에 안 보이는 것 방지
  const [headerDark, setHeaderDark] = useState(false)

  // 설치된 앱(전체화면/standalone)에서 뒤로가기 두 번으로 종료 + 안내 토스트
  const [toast, setToast] = useState('')

  function addRecent(code) {
    setRecents((prev) => {
      const next = [code, ...prev.filter((c) => c !== code)].slice(0, 6)
      try {
        localStorage.setItem('triprate-recent', JSON.stringify(next))
      } catch {
        // 저장 실패해도 앱은 그냥 동작
      }
      return next
    })
  }

  // 카드 i를 고른 엔트리(나라 또는 통화)로 바꾸기
  function changeCurrency(i, entry) {
    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === i ? { ...slot, code: entry.code, place: entry.place, flag: entry.flag } : slot,
      ),
    )
    addRecent(entry.key)
  }

  // +버튼 팝업에서 고른 엔트리로 카드 추가 (개수 제한 없음)
  function addCard(entry) {
    setSlots((prev) => [
      ...prev,
      { id: nextSlotId.current++, code: entry.code, place: entry.place, flag: entry.flag },
    ])
    addRecent(entry.key)
    setAddOpen(false)
  }

  // 앱이 처음 열리면: 뒤에서 조용히 최신 환율로 갱신 시도
  useEffect(() => {
    let cancelled = false
    fetch(API_URL, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.result !== 'success') throw new Error('API 응답 오류')
        const savedAt = data.time_last_update_unix * 1000
        setRates(data.rates)
        setUpdatedAt(new Date(savedAt))
        setStatus('ready')
        setOffline(false)
        saveCached(data.rates, savedAt)
      })
      .catch(() => {
        if (cancelled) return
        if (loadCached()) setOffline(true)
        else setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 첫 카드(나라/통화)가 바뀌면 새 배경을 위에 얹어 페이드인 (틱 전환 대신 스며들듯)
  const homeKey = slots[0].place || slots[0].code
  useEffect(() => {
    let cancelled = false
    getTheme(homeKey).then((t) => {
      if (cancelled) return
      setBgLayers((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.bg === t.bg) {
          // 같은 배경 — 색 샘플링이 끝나 제목 색만 바뀐 경우 그 레이어만 갱신
          if (last.title === t.title) return prev
          const next = prev.slice()
          next[next.length - 1] = { ...last, title: t.title }
          return next
        }
        return [...prev, { id: nextLayerId.current++, bg: t.bg, title: t.title, image: !!t.image }]
      })
    })
    return () => {
      cancelled = true
    }
  }, [homeKey])

  // 배경 윗부분 밝기에 따라 헤더 글씨색 결정
  useEffect(() => {
    let cancelled = false
    getHeaderDark(homeKey).then((dark) => {
      if (!cancelled) setHeaderDark(dark)
    })
    return () => {
      cancelled = true
    }
  }, [homeKey])

  // 상태바 색(theme-color)을 배경 윗부분과 맞춤 — 설치앱에서 상단 검정 띠 없이 자연스럽게
  useEffect(() => {
    let cancelled = false
    getTopColor(homeKey).then((hex) => {
      if (cancelled) return
      let meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'theme-color')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', hex)
    })
    return () => {
      cancelled = true
    }
  }, [homeKey])

  // 하단 내비게이션 바 색을 배경 바닥색과 맞춤 — body 배경색이 캔버스로 전파돼 안드로이드 하단바에 반영.
  // 시각적 배경은 .app-bg(fixed)가 위에서 그대로 덮으므로 영향 없음.
  useEffect(() => {
    let cancelled = false
    getBottomColor(homeKey).then((hex) => {
      if (!cancelled) document.body.style.backgroundColor = hex
    })
    return () => {
      cancelled = true
    }
  }, [homeKey])

  // 설치된 앱에서 "뒤로가기 두 번 누르면 종료" — 한 번 누르면 안내, 2초 내 다시 누르면 종료.
  // (브라우저 탭에서는 적용 안 함)
  useEffect(() => {
    // 설치된 앱이면(브라우저 탭이 아니면) 동작 — 전체화면/standalone/minimal-ui 모두 포함
    const installed =
      window.navigator.standalone === true ||
      (window.matchMedia && !window.matchMedia('(display-mode: browser)').matches)
    if (!installed) return

    // 뒤로가기를 잡아둘 더미 기록 하나를 쌓아둔다
    window.history.pushState(null, '', window.location.href)
    let lastBack = 0
    let toastTimer

    const onPop = () => {
      const now = Date.now()
      if (now - lastBack < 2000) {
        // 2초 내 두 번째 → 실제로 한 칸 더 뒤로(앱 종료)
        window.history.back()
        return
      }
      // 첫 번째 → 다시 더미를 쌓아 앱에 머무르고 안내 표시
      lastBack = now
      window.history.pushState(null, '', window.location.href)
      setToast(t.exitHint)
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => setToast(''), 1800)
    }

    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      clearTimeout(toastTimer)
    }
  }, [])

  // 새 배경 레이어의 페이드인이 끝나면 그 아래 오래된 레이어들을 정리
  function handleBgFadeDone(id) {
    setBgLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id)
      if (idx === prev.length - 1 && idx > 0) return prev.slice(idx)
      return prev
    })
  }

  const ready = status === 'ready'
  const amount = parseAmount(value)

  // 카드 i에 보여줄 금액: 입력한 카드는 그대로, 나머지는 자동 계산
  function displayFor(i) {
    if (i === activeIndex) return value
    if (!ready) return ''
    return formatAmount(
      convert(amount, slots[activeIndex].code, slots[i].code, rates),
      slots[i].code,
    )
  }

  // ✕ : 카드 i 빼기 (첫 카드는 못 뺌). 활성 카드를 빼면 기준 카드 값으로 이어받기
  function removeCard(i) {
    if (i === 0) return
    if (i === activeIndex) {
      setValue(displayFor(0)) // 0번 카드의 현재 표시값을 입력값으로 가져옴
      setActiveIndex(0)
    } else if (activeIndex > i) {
      setActiveIndex((prev) => prev - 1)
    }
    setSlots((prev) => prev.filter((_, idx) => idx !== i))
  }

  // ⇅ : 순서를 바로 바꾸고(layout이 부드럽게 이동) 잠깐 입체 강조(올라오는 카드 확대·앞)
  function doSwap() {
    if (slots.length < 2) return
    setSlots((prev) => {
      const next = [...prev]
      ;[next[0], next[1]] = [next[1], next[0]]
      return next
    })
    setActiveIndex((prev) => (prev === 0 ? 1 : prev === 1 ? 0 : prev))
    setSwapping(true)
    if (swapTimer.current) clearTimeout(swapTimer.current)
    swapTimer.current = setTimeout(() => setSwapping(false), 480)
  }

  // 카드 i의 모션 props: 추가(아래→위)/삭제(왼쪽)/위치이동(layout) + 스왑 시 입체 강조
  function cardAnim(i) {
    return {
      layout: true, // 추가·삭제·스왑 시 다른 카드들이 부드럽게 자리 이동
      initial: { opacity: 0, y: 40 },
      animate: {
        opacity: 1,
        y: 0,
        scale: swapping && i < 2 ? (i === 0 ? [1, 1.06, 1] : [1, 0.94, 1]) : 1,
      },
      exit: { opacity: 0, x: -90, transition: { duration: 0.28 } },
      transition: swapping
        ? { duration: 0.48, ease: 'easeInOut' }
        : { duration: 0.3, ease: 'easeOut' },
      // position은 인라인으로 주지 않는다(.currency-card가 CSS에서 이미 relative).
      // 인라인 relative를 주면 popLayout이 빠지는 카드를 absolute로 못 빼서
      // 카드가 자리를 계속 차지 → +버튼이 unmount 때 "틱" 점프함.
      style: {
        zIndex: swapping ? (i === 0 ? 3 : i === 1 ? 1 : 0) : 'auto',
      },
    }
  }

  // 선택 목록(나라 + 통화 통합 엔트리)
  const entries = useMemo(() => buildEntries(rates), [rates])

  // 맨 아래 안내 문구 (상태별)
  let rateNote = ''
  if (status === 'loading') rateNote = t.loading
  else if (status === 'error') rateNote = t.error
  else if (updatedAt) rateNote = t.rateNote(formatDateStr(updatedAt))

  return (
    <>
      <div className="app-bg" aria-hidden="true">
        {bgLayers.map((layer) => (
          <div
            key={layer.id}
            className={layer.image ? 'app-bg-layer is-image' : 'app-bg-layer'}
            style={{ background: layer.bg }}
            onAnimationEnd={() => handleBgFadeDone(layer.id)}
          />
        ))}
      </div>
      <main className="app">
        <header className={headerDark ? 'app-header on-dark' : 'app-header'}>
          <h1 className="app-logo" aria-label="LucidTrip">
            {bgLayers.map((layer) => (
              <span
                key={layer.id}
                className="logo-layer"
                style={{ backgroundImage: layer.title }}
              />
            ))}
          </h1>
          <p className="tagline">The Lucid Standard for Every Trip</p>
        </header>

        <section className="converter">
          {/* 카드들을 하나의 목록으로(안정적인 key=id) + 첫 카드 뒤에 스왑 구분선.
              스왑 시 카드는 재생성 없이 자리만 바꾼다. 추가=아래→위, 삭제=왼쪽으로. */}
          <AnimatePresence initial={false} mode="popLayout">
            {slots.flatMap((slot, i) => {
              const card = (
                <CurrencyCard
                  key={slot.id}
                  code={slot.code}
                  flag={slot.flag}
                  valueKey={slot.place || slot.code}
                  entries={entries}
                  recents={recents}
                  onCurrencyChange={(entry) => changeCurrency(i, entry)}
                  amount={displayFor(i)}
                  onAmountChange={(v) => {
                    setActiveIndex(i)
                    setValue(formatInput(v))
                  }}
                  onRemove={i === 0 ? null : () => removeCard(i)}
                  anim={cardAnim(i)}
                />
              )
              if (i === 0 && slots.length > 1) {
                return [
                  card,
                  <motion.div
                    className="swap-divider"
                    key="swap"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  >
                    <button
                      type="button"
                      className="swap-button"
                      onClick={doSwap}
                      aria-label={t.swap}
                    >
                      <svg className="swap-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 10l5-5 5 5" />
                        <path d="M7 14l5 5 5-5" />
                      </svg>
                    </button>
                  </motion.div>,
                ]
              }
              return [card]
            })}
          </AnimatePresence>

          <motion.div className="add-row" layout>
            <button
              type="button"
              className="add-button"
              onClick={() => setAddOpen(true)}
              aria-label={t.addCard}
            >
              <svg className="add-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </motion.div>
        </section>

        <footer className="app-footer">
          {offline && status !== 'error' && (
            <div>
              <span className="offline-badge">{t.offline}</span>
            </div>
          )}
          <p className={status === 'error' ? 'rate-note error' : 'rate-note'}>
            {rateNote}
          </p>
        </footer>
      </main>

      <CurrencyPickerModal
        open={addOpen}
        valueKey={null}
        entries={entries}
        recents={recents}
        onPick={addCard}
        onClose={() => setAddOpen(false)}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            className="exit-toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App

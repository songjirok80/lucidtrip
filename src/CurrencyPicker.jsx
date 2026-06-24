import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FAVORITES } from './currencies'
import { t } from './i18n'

// 국기 한 칸: 국기 코드가 있으면 SVG, 없으면 중립 자리표시
function Flag({ code }) {
  if (!code) return <span className="flag flag-none" aria-hidden="true" />
  return <span className={`flag fi fi-${code}`} aria-hidden="true" />
}

// 목록 안의 한 줄 (나라 또는 통화)
function EntryRow({ item, active, onPick }) {
  return (
    <button
      type="button"
      className={active ? 'picker-row active' : 'picker-row'}
      onClick={() => onPick(item)}
    >
      <Flag code={item.flag} />
      <span className="picker-code">{item.code}</span>
      <span className="picker-name">{item.label}</span>
    </button>
  )
}

// 선택 팝업: 검색 + 목록. body로 포털 렌더 → 항상 화면 중앙·최상단.
// 열림/닫힘 시 어두운 배경 페이드 + 패널 살짝 확대/슬라이드 모션. 바깥 터치 시 닫힘.
export function CurrencyPickerModal({ open, valueKey, entries, recents, onPick, onClose }) {
  const [query, setQuery] = useState('')

  // 닫히면 검색어 초기화 (다음에 열 때 깨끗하게)
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const favKeys = [...new Set([...FAVORITES, ...recents])]
  const favorites = favKeys
    .map((k) => entries.find((e) => e.key === k))
    .filter(Boolean)

  const q = query.trim().toLowerCase()
  const filtered = q ? entries.filter((e) => e.search.includes(q)) : entries

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="picker-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="picker-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <input
              className="picker-search"
              type="text"
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="picker-list">
              {!q && favorites.length > 0 && (
                <>
                  <div className="picker-section">{t.favorites}</div>
                  {favorites.map((e) => (
                    <EntryRow
                      key={'fav-' + e.key}
                      item={e}
                      active={e.key === valueKey}
                      onPick={onPick}
                    />
                  ))}
                  <div className="picker-section">{t.all}</div>
                </>
              )}
              {filtered.map((e) => (
                <EntryRow
                  key={e.key}
                  item={e}
                  active={e.key === valueKey}
                  onPick={onPick}
                />
              ))}
              {filtered.length === 0 && (
                <div className="picker-empty">{t.noResults}</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// 선택 버튼(카드 안): 평소엔 국기+코드, 누르면 팝업이 열린다
export default function CurrencyPicker({ valueKey, code, flag, entries, recents, onChange }) {
  const [open, setOpen] = useState(false)

  function pick(entry) {
    onChange(entry)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="currency-trigger"
        onClick={() => setOpen(true)}
      >
        <Flag code={flag} />
        <span className="currency-code">{code}</span>
      </button>

      <CurrencyPickerModal
        open={open}
        valueKey={valueKey}
        entries={entries}
        recents={recents}
        onPick={pick}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

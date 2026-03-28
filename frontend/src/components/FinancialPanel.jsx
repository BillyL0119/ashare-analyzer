import { useState, useEffect } from 'react'
import { getFinancial } from '../api/stockApi'
import useLangStore from '../store/langStore'
import { T } from '../i18n/translations'
import { THEME } from '../utils/chartHelpers'

const CARD_SECTIONS = [
  {
    titleKey: 'financialValuation',
    metrics: [
      { key: 'pe_ttm',  labelKey: 'financialPE',  src: 'valuation', unit: 'x',  noYoY: true },
      { key: 'pb',      labelKey: 'financialPB',   src: 'valuation', unit: 'x',  noYoY: true },
    ],
  },
  {
    titleKey: 'financialProfitability',
    metrics: [
      { key: 'gross_margin', labelKey: 'financialGrossMargin', src: 'profitability', unit: '%' },
      { key: 'net_margin',   labelKey: 'financialNetMargin',   src: 'profitability', unit: '%' },
      { key: 'roe',          labelKey: 'financialROE',          src: 'profitability', unit: '%' },
    ],
  },
  {
    titleKey: 'financialGrowth',
    metrics: [
      { key: 'revenue_growth', labelKey: 'financialRevenueGrowth', src: 'growth', unit: '%' },
    ],
  },
  {
    titleKey: 'financialCashflow',
    metrics: [
      { key: 'operating_cf', labelKey: 'financialOperatingCF', src: 'cashflow', unit: '亿', noYoY: true },
    ],
  },
]

function MetricCard({ label, value, unit, yoy, date, lang }) {
  const t = T[lang]
  const isPositive = yoy !== null && yoy !== undefined && yoy > 0
  const isNegative = yoy !== null && yoy !== undefined && yoy < 0
  const hasYoY = yoy !== null && yoy !== undefined

  const fmtVal = (v) => {
    if (v === null || v === undefined) return '—'
    const n = Number(v)
    if (isNaN(n)) return '—'
    return n.toFixed(2)
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${THEME.border}`,
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 150,
      }}
    >
      <div style={{ fontSize: 12, color: '#9aa0a6', fontWeight: 500 }}>{label}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#e8eaed' }}>
          {fmtVal(value)}
        </span>
        <span style={{ fontSize: 13, color: '#9aa0a6' }}>{unit}</span>
      </div>

      {hasYoY && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
          }}
        >
          <span style={{ color: '#9aa0a6' }}>{t.financialYoY}:</span>
          <span
            style={{
              color: isPositive ? '#26a69a' : isNegative ? '#ef5350' : '#9aa0a6',
              fontWeight: 600,
            }}
          >
            {isPositive ? '+' : ''}{fmtVal(yoy)}{unit}
          </span>
        </div>
      )}

      {date && (
        <div style={{ fontSize: 11, color: '#4a5568' }}>
          {t.financialReportDate}: {date}
        </div>
      )}
    </div>
  )
}

function SectionBlock({ titleKey, metrics, data, lang }) {
  const t = T[lang]

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#9aa0a6',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        {t[titleKey]}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {metrics.map(({ key, labelKey, src, unit, noYoY }) => {
          const bucket = data?.[src] || {}
          const raw = bucket[key]
          let value, yoy, date

          if (raw !== null && raw !== undefined && typeof raw === 'object') {
            value = raw.value
            yoy = noYoY ? undefined : raw.yoy
            date = raw.date
          } else {
            value = raw
            yoy = undefined
            date = undefined
          }

          return (
            <MetricCard
              key={key}
              label={t[labelKey]}
              value={value}
              unit={unit}
              yoy={yoy}
              date={date}
              lang={lang}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function FinancialPanel({ stocks }) {
  const lang = useLangStore((s) => s.lang)
  const t = T[lang]

  const [dataMap, setDataMap] = useState({})
  const [loadingMap, setLoadingMap] = useState({})
  const [errorMap, setErrorMap] = useState({})

  useEffect(() => {
    stocks.forEach((stock) => {
      if (dataMap[stock.code] || loadingMap[stock.code]) return
      setLoadingMap((p) => ({ ...p, [stock.code]: true }))
      getFinancial(stock.code)
        .then((res) => {
          setDataMap((p) => ({ ...p, [stock.code]: res.data }))
          setErrorMap((p) => ({ ...p, [stock.code]: null }))
        })
        .catch((err) => {
          const msg = err?.response?.data?.detail || t.financialNoData
          setErrorMap((p) => ({ ...p, [stock.code]: msg }))
        })
        .finally(() => {
          setLoadingMap((p) => ({ ...p, [stock.code]: false }))
        })
    })
  }, [stocks]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {stocks.map((stock) => {
        const loading = loadingMap[stock.code]
        const error = errorMap[stock.code]
        const data = dataMap[stock.code]

        return (
          <div
            key={stock.code}
            style={{
              background: THEME.gridBg,
              border: `1px solid ${THEME.border}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            {/* Stock header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: `1px solid ${THEME.border}`,
              }}
            >
              <span
                style={{
                  background: 'rgba(138,180,248,0.08)',
                  border: '1px solid rgba(138,180,248,0.3)',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 12,
                  color: '#8ab4f8',
                  fontFamily: 'monospace',
                }}
              >
                {stock.code}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#e8eaed' }}>{stock.name}</span>
              <span style={{ fontSize: 12, color: '#4a5568', marginLeft: 'auto' }}>
                {t.financialAnalysis}
              </span>
            </div>

            {/* States */}
            {loading && (
              <div style={{ color: '#9aa0a6', fontSize: 13, padding: '20px 0' }}>
                {t.financialLoading}
              </div>
            )}

            {error && !loading && (
              <div
                style={{
                  color: '#f85149',
                  fontSize: 13,
                  padding: '16px',
                  background: '#f8514910',
                  border: '1px solid #f8514930',
                  borderRadius: 6,
                }}
              >
                {error}
              </div>
            )}

            {data && !loading && (
              <div>
                {CARD_SECTIONS.map(({ titleKey, metrics }) => (
                  <SectionBlock
                    key={titleKey}
                    titleKey={titleKey}
                    metrics={metrics}
                    data={data}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

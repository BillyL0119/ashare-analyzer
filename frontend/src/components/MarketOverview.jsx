import { useMobile } from '../hooks/useMobile'

// Bottom of the home page. The site introduces itself once, at the top (nav/StartHere); down here
// only the credits and data sources.
export default function MarketOverview({ lang }) {
  const zh = lang === 'zh'
  const isMobile = useMobile()
  return (
    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0, padding: isMobile ? '24px 0' : '32px 0' }}>
      {zh
        ? '由两名高中生 Billy 和 Frank 合作开发 · 仅供学习用途'
        : 'Built by two high school students, Billy and Frank · For educational use only'}
      <br />
      {zh
        ? '数据来源：腾讯财经 · 纳斯达克 · 新浪财经 · AkShare'
        : 'Data: Tencent Finance · Nasdaq · Sina Finance · AkShare'}
    </p>
  )
}

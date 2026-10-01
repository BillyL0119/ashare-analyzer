/**
 * Locale-aware relative time formatter — supports zh, ja, ko, fr, en (default)
 * @param {string} iso  ISO date string
 * @param {string} lang language code
 */
export function relativeTime(iso, lang) {
  if (!iso) return ''
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    switch (lang) {
      case 'zh':
        if (diff < 60)       return '刚刚'
        if (diff < 3600)     return `${Math.floor(diff / 60)}分钟前`
        if (diff < 86400)    return `${Math.floor(diff / 3600)}小时前`
        if (diff < 2592000)  return `${Math.floor(diff / 86400)}天前`
        return new Date(iso).toLocaleDateString('zh-CN')
      case 'ja':
        if (diff < 60)       return 'たった今'
        if (diff < 3600)     return `${Math.floor(diff / 60)}分前`
        if (diff < 86400)    return `${Math.floor(diff / 3600)}時間前`
        if (diff < 2592000)  return `${Math.floor(diff / 86400)}日前`
        return new Date(iso).toLocaleDateString('ja-JP')
      case 'ko':
        if (diff < 60)       return '방금'
        if (diff < 3600)     return `${Math.floor(diff / 60)}분 전`
        if (diff < 86400)    return `${Math.floor(diff / 3600)}시간 전`
        if (diff < 2592000)  return `${Math.floor(diff / 86400)}일 전`
        return new Date(iso).toLocaleDateString('ko-KR')
      case 'fr':
        if (diff < 60)       return "à l'instant"
        if (diff < 3600)     return `il y a ${Math.floor(diff / 60)} min`
        if (diff < 86400)    return `il y a ${Math.floor(diff / 3600)} h`
        if (diff < 2592000)  return `il y a ${Math.floor(diff / 86400)} j`
        return new Date(iso).toLocaleDateString('fr-FR')
      default: // 'en'
        if (diff < 60)       return 'just now'
        if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`
        if (diff < 2592000)  return `${Math.floor(diff / 86400)}d ago`
        return new Date(iso).toLocaleDateString('en-US')
    }
  } catch { return '' }
}

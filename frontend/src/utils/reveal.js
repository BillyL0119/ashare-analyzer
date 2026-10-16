// Scroll entrances: any element marked data-reveal gets .is-in once it enters the viewport,
// and its children rise in turn (see index.css). Elements added later are picked up too.
// Without IntersectionObserver everything is simply shown.
export function startReveal() {
  if (typeof window === 'undefined') return
  const show = (el) => el.classList.add('is-in')
  if (!('IntersectionObserver' in window)) {
    document.documentElement.classList.add('no-js')
    return
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { show(e.target); io.unobserve(e.target) }
  }, { rootMargin: '0px 0px -8% 0px' })
  const scan = () => document.querySelectorAll('[data-reveal]:not(.is-in):not([data-reveal-seen])').forEach((el) => {
    el.setAttribute('data-reveal-seen', '')
    io.observe(el)
  })
  scan()
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true })
}

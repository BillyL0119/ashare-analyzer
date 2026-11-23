// setInterval that only ticks while the tab is on screen. A page in a background tab (or a minimised window) keeps
// its timers, network requests and re-renders running otherwise, and that is what drains a laptop battery.
// When the tab comes back, the callback runs at once if the last run is older than one period, so what the
// reader sees is never stale. Returns the cleanup function.
export default function visibleInterval(fn, ms) {
  let last = Date.now()
  const run = () => { last = Date.now(); fn() }
  const id = setInterval(() => { if (document.visibilityState === 'visible') run() }, ms)
  const onShow = () => { if (document.visibilityState === 'visible' && Date.now() - last >= ms) run() }
  document.addEventListener('visibilitychange', onShow)
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', onShow) }
}

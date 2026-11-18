import MacroCalendarPage from '../MacroCalendarPage'

// Stub from the quote-pages framework: the calendar slice turns this into the week-strip events calendar
// (economic, earnings, IPOs, splits, dividends). Until then it shows the economic calendar as before.
export default function EventsCalendarPage({ lang }) {
  return <MacroCalendarPage lang={lang} />
}

// Line icons for the interface: one weight, drawn on a 24-unit grid, coloured by the surrounding text.
// They stand where emoji used to: an emoji looks different on every device and never matches the type.
const PATHS = {
  sun:       <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon:      <path d="M20.5 13.4A8.5 8.5 0 1 1 10.6 3.5a6.6 6.6 0 0 0 9.9 9.9z" />,
  bulb:      <path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-4 10.5c.7.7 1.1 1.5 1.1 2.5h5.8c0-1 .4-1.8 1.1-2.5A6 6 0 0 0 12 3z" />,
  tutor:     <path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9zM6.5 11v4.6c0 1.4 2.5 2.9 5.5 2.9s5.5-1.5 5.5-2.9V11M21.5 9v5.5" />,
  star:      <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z" />,
  search:    <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  chart:     <path d="M3.5 3.500v17h17M7.5 15.500l3.5-4.5 3 2.5 4.5-6.5" />,
  filter:    <path d="M3.5 5h17l-6.5 7.500v6l-4-2v-4z" />,
  grid:      <path d="M3.5 3.500h8v8h-8zM13.5 3.500h7v5h-7zM13.5 10.500h7v10h-7zM3.5 13.500h8v7h-8z" />,
  news:      <path d="M4 4.500h12.500v15H6a2 2 0 0 1-2-2zM16.5 8.500H20v9a2 2 0 0 1-2 2M7.5 8.500h5.500M7.5 12h5.500M7.5 15.500h5.5" />,
  calendar:  <><rect x="3.5" y="5" width="17" height="15.5" rx="1.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  quote:     <path d="M4 5h16v11H9.500L4 20z" />,
  cash:      <><rect x="3" y="6.5" width="18" height="11" rx="1.5" /><circle cx="12" cy="12" r="2.5" /></>,
  clock:     <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.500V12l3 2" /></>,
  book:      <path d="M4.5 5a2 2 0 0 1 2-2H19v15.500H6.500a2 2 0 0 0-2 2zM4.5 20.500a2 2 0 0 0 2 2H19" transform="translate(0 -1)" />,
  file:      <path d="M6.5 3.500h7.500l4 4v13h-11.500zM14 3.500v4h4M9.5 12.500h5.500M9.5 16h5.5" />,
  curves:    <path d="M4 3.500v16.500h16.500M7.5 7c1.5 5.5 5.5 8.5 11 9.500M7.5 16.500c4-1 7.5-4 10.5-9.5" />,
  landmark:  <path d="M3.5 20.500h17M5.5 17.500V11M10 17.500V11M14 17.500V11M18.5 17.500V11M12 3.500l8.5 5h-17z" />,
  users:     <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.500c0-3.2 2.7-5.3 6-5.300s6 2.1 6 5.300M15.5 5.600a3.2 3.2 0 0 1 0 5.800M17.5 14.600c2 .7 3.5 2.5 3.5 4.9" /></>,
  globe:     <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.500c3 3 3 14 0 17M12 3.500c-3 3-3 14 0 17" /></>,
  briefcase: <><rect x="3" y="7.5" width="18" height="12.5" rx="1.5" /><path d="M9 7.500V5.500a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13.500h18" /></>,
  compass:   <><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  bolt:      <path d="M13 3 5 13.500h6l-1 7.5 8-10.500h-6z" />,
  flag:      <path d="M5 21V4M5 4.500h12l-2 4 2 4H5" />,
  check:     <path d="m5 12.5 4.5 4.500L19 7.5" />,
  alert:     <path d="M12 4 2.5 20h19zM12 10v4.500M12 17.300v.2" />,
  pin:       <><path d="M12 21c4-4.5 6.5-7.8 6.5-11a6.5 6.5 0 0 0-13 0c0 3.2 2.5 6.5 6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  trophy:    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 5.500H4.500V7A3.5 3.5 0 0 0 8 10.500M16 5.500h3.500V7A3.5 3.5 0 0 1 16 10.500M12 13v4M8.5 20h7M9.5 17h5" />,
  pencil:    <path d="M4 20l1-4.500L16.5 4l3.5 3.500L8.5 19zM14 6.500l3.5 3.5" />,
  chat:      <path d="M4 5h16v11.500H10L5.5 20v-3.500H4z" />,
  target:    <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  trash:     <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />,
  user:      <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c0-3.5 3-5.8 7-5.8s7 2.3 7 5.8" /></>,
  hourglass: <path d="M7 3.5h10M7 20.5h10M8 3.5c0 4 3 5.5 4 8.5 1-3 4-4.5 4-8.500M8 20.5c0-4 3-5.5 4-8.5 1 3 4 4.5 4 8.5" />,
  link:      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.700l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.700l1-1" />,
}

export default function Icon({ name, size = 18, strokeWidth = 1.6, style, className }) {
  const shape = PATHS[name]
  if (!shape) return null
  return (
    <svg
      className={className}
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      style={{ flex: 'none', display: 'block', ...style }}
    >
      {shape}
    </svg>
  )
}

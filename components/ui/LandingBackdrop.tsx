const FENCE_BARS = Array.from({ length: 81 }, (_, index) => index * 20);

/** Layered SVG rather than WebGL, so the landing page appears immediately. */
export function LandingBackdrop() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="landing-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0f24" />
          <stop offset="0.65" stopColor="#222a52" />
          <stop offset="1" stopColor="#46507f" />
        </linearGradient>
        <radialGradient id="landing-halo">
          <stop offset="0" stopColor="#c8d8ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#c8d8ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#landing-sky)" />
      <circle cx="1230" cy="190" r="240" fill="url(#landing-halo)" />
      <circle cx="1230" cy="190" r="72" fill="#e4ebff" />
      <path d="M0 640 C220 540 380 610 560 570 S940 500 1140 580 1450 530 1600 600 V900 H0Z" fill="#242b52" />
      <path d="M0 720 C260 650 480 720 760 680 S1260 650 1600 710 V900 H0Z" fill="#191e3c" />

      <g fill="none" stroke="#0e1126" strokeLinecap="round">
        <path strokeWidth="15" d="M210 800 C220 680 200 610 230 500" />
        <path strokeWidth="8" d="M224 590 C170 550 150 500 120 470 M230 540 C280 490 300 450 350 420 M230 500 C225 450 250 400 240 350" />
        <path strokeWidth="4" d="M160 520 C140 510 110 515 85 505 M300 455 C320 460 350 470 385 465 M245 400 C270 380 275 350 300 335 M240 350 C225 330 220 310 205 295" />
        <path strokeWidth="11" d="M1420 810 C1405 720 1440 660 1420 560" />
        <path strokeWidth="6" d="M1424 640 C1480 610 1500 570 1540 545 M1420 590 C1380 550 1365 520 1330 500 M1420 560 C1430 520 1410 490 1425 450" />
      </g>

      <path d="M0 790 C400 760 1100 770 1600 785 V900 H0Z" fill="#0e1126" />
      <g fill="#0e1126">
        {FENCE_BARS.map((x) => (
          <path key={x} d={`M${x + 8} 800 V722 L${x + 10} 708 L${x + 12} 722 V800Z`} />
        ))}
        <rect y="738" width="1600" height="5" />
      </g>
    </svg>
  );
}

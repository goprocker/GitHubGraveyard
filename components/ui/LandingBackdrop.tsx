const FENCE_BARS = Array.from({ length: 81 }, (_, index) => index * 20);

// Fixed pseudo-random positions so the server and the browser render the same sky.
const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 197) % 1600,
  y: (i * 89) % 470,
  r: 0.8 + ((i * 7) % 10) / 10,
  delay: ((i * 37) % 50) / 10,
}));

const FIREFLIES = Array.from({ length: 14 }, (_, i) => ({
  x: 120 + ((i * 263) % 1360),
  y: 600 + ((i * 53) % 170),
  delay: ((i * 13) % 40) / 10,
  duration: 5 + ((i * 7) % 5),
}));

const BAT = "M0 0c4-5 9-6 12-3 1-3 3-4 4-2 1-2 3-1 4 2 3-3 8-2 12 3-5-1-8 0-10 3-2-2-4-2-6 0-2-2-4-2-6 0-2-3-5-4-10-3z";

/** Layered SVG rather than WebGL, so the landing page appears immediately. CSS brings it to life. */
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
        <filter id="landing-fog" x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      <rect width="1600" height="900" fill="url(#landing-sky)" />

      <g fill="#e4ebff">
        {STARS.map((star) => (
          <circle
            key={`${star.x}-${star.y}`}
            className="twinkle"
            cx={star.x}
            cy={star.y}
            r={star.r}
            style={{ animationDelay: `${star.delay}s` }}
          />
        ))}
      </g>

      <circle className="moon-glow" cx="1230" cy="190" r="240" fill="url(#landing-halo)" />
      <circle cx="1230" cy="190" r="72" fill="#e4ebff" />
      <g fill="#b9c2e2" opacity="0.35">
        <circle cx="1206" cy="172" r="11" />
        <circle cx="1252" cy="214" r="8" />
        <circle cx="1240" cy="162" r="5" />
      </g>

      <g className="cloud-drift" fill="#3a4377" opacity="0.55">
        <path d="M0 230c40-30 90-30 120-5 30-25 90-25 120 5 30-10 60 0 70 20H-30c0-10 10-20 30-20z" />
        <path d="M700 120c30-22 70-22 95-4 25-18 70-18 95 4 22-8 46 0 55 16H675c0-8 8-16 25-16z" />
      </g>
      <g className="cloud-drift-slow" fill="#2c3463" opacity="0.6">
        <path d="M1050 260c40-28 95-28 125-5 30-23 95-23 125 5 30-10 60 0 70 20H1020c0-10 10-20 30-20z" />
      </g>

      <g fill="#0b0e22">
        <path className="bat bat-a" d={BAT} />
        <path className="bat bat-b" d={BAT} />
        <path className="bat bat-c" d={BAT} />
      </g>

      <path d="M0 640 C220 540 380 610 560 570 S940 500 1140 580 1450 530 1600 600 V900 H0Z" fill="#242b52" />
      <path d="M0 720 C260 650 480 720 760 680 S1260 650 1600 710 V900 H0Z" fill="#191e3c" />

      <g className="fog-band" fill="#8f9bd0" opacity="0.12" filter="url(#landing-fog)">
        <ellipse cx="400" cy="740" rx="520" ry="40" />
        <ellipse cx="1250" cy="760" rx="480" ry="36" />
      </g>

      <g fill="none" stroke="#0e1126" strokeLinecap="round">
        <g className="sway">
          <path strokeWidth="15" d="M210 800 C220 680 200 610 230 500" />
          <path strokeWidth="8" d="M224 590 C170 550 150 500 120 470 M230 540 C280 490 300 450 350 420 M230 500 C225 450 250 400 240 350" />
          <path strokeWidth="4" d="M160 520 C140 510 110 515 85 505 M300 455 C320 460 350 470 385 465 M245 400 C270 380 275 350 300 335 M240 350 C225 330 220 310 205 295" />
        </g>
        <g className="sway sway-late">
          <path strokeWidth="11" d="M1420 810 C1405 720 1440 660 1420 560" />
          <path strokeWidth="6" d="M1424 640 C1480 610 1500 570 1540 545 M1420 590 C1380 550 1365 520 1330 500 M1420 560 C1430 520 1410 490 1425 450" />
        </g>
      </g>

      <path d="M0 790 C400 760 1100 770 1600 785 V900 H0Z" fill="#0e1126" />
      <g fill="#0e1126">
        {FENCE_BARS.map((x) => (
          <path key={x} d={`M${x + 8} 800 V722 L${x + 10} 708 L${x + 12} 722 V800Z`} />
        ))}
        <rect y="738" width="1600" height="5" />
      </g>

      <g className="fog-band fog-band-front" fill="#9aa6da" opacity="0.1" filter="url(#landing-fog)">
        <ellipse cx="800" cy="810" rx="700" ry="34" />
      </g>

      <g fill="#f3d27a">
        {FIREFLIES.map((fly) => (
          <circle
            key={`${fly.x}-${fly.y}`}
            className="firefly"
            cx={fly.x}
            cy={fly.y}
            r="2.6"
            style={{ animationDelay: `${fly.delay}s`, animationDuration: `${fly.duration}s` }}
          />
        ))}
      </g>
    </svg>
  );
}

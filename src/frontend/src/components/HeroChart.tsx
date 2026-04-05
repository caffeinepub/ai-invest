import { useEffect, useState } from "react";

export function HeroChart() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Rising line chart path
  const points: [number, number][] = [
    [20, 180],
    [60, 160],
    [100, 150],
    [140, 130],
    [180, 110],
    [220, 95],
    [260, 80],
    [300, 55],
    [340, 40],
    [380, 20],
  ];

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`)
    .join(" ");

  const areaPath = `${linePath} L 380 200 L 20 200 Z`;

  const pathLength = 600;

  return (
    <div className="relative w-full h-64 md:h-80">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* Grid */}
        {[40, 80, 120, 160].map((y) => (
          <line
            key={`gy-${y}`}
            x1="0"
            y1={y}
            x2="400"
            y2={y}
            stroke="oklch(0.235 0.015 200)"
            strokeWidth="1"
          />
        ))}
        {[80, 160, 240, 320].map((x) => (
          <line
            key={`gx-${x}`}
            x1={x}
            y1="0"
            x2={x}
            y2="200"
            stroke="oklch(0.235 0.015 200)"
            strokeWidth="1"
          />
        ))}

        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="oklch(0.723 0.2 149)"
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor="oklch(0.723 0.2 149)"
              stopOpacity="0"
            />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#chartGradient)"
          style={{
            opacity: animated ? 1 : 0,
            transition: "opacity 1s ease 0.5s",
          }}
        />

        {/* Main line */}
        <path
          d={linePath}
          fill="none"
          stroke="oklch(0.723 0.2 149)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          strokeDasharray={pathLength}
          strokeDashoffset={animated ? 0 : pathLength}
          style={{
            transition: "stroke-dashoffset 1.8s cubic-bezier(0.4,0,0.2,1) 0.2s",
          }}
        />

        {/* Glow overlay line */}
        <path
          d={linePath}
          fill="none"
          stroke="oklch(0.82 0.17 149)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
          strokeDasharray={pathLength}
          strokeDashoffset={animated ? 0 : pathLength}
          style={{
            transition: "stroke-dashoffset 1.8s cubic-bezier(0.4,0,0.2,1) 0.2s",
          }}
        />

        {/* Data points */}
        {points.map((p) => (
          <circle
            key={`pt-${p[0]}-${p[1]}`}
            cx={p[0]}
            cy={p[1]}
            r="3"
            fill="oklch(0.723 0.2 149)"
            filter="url(#glow)"
            style={{
              opacity: animated ? 1 : 0,
              transition: `opacity 0.3s ease ${0.5 + (p[0] / 400) * 1.5}s`,
            }}
          />
        ))}

        {/* End point highlight */}
        <circle
          cx="380"
          cy="20"
          r="5"
          fill="oklch(0.82 0.17 149)"
          filter="url(#glow)"
          style={{
            opacity: animated ? 1 : 0,
            transition: "opacity 0.3s ease 2s",
          }}
        />
        <circle
          cx="380"
          cy="20"
          r="9"
          fill="none"
          stroke="oklch(0.82 0.17 149)"
          strokeWidth="1.5"
          style={{
            opacity: animated ? 0.4 : 0,
            transition: "opacity 0.3s ease 2.1s",
          }}
        />

        {/* Y-axis labels */}
        {["+42%", "+28%", "+14%", "0%"].map((label, i) => (
          <text
            key={label}
            x="8"
            y={20 + i * 50}
            fill="oklch(0.55 0.01 200)"
            fontSize="9"
            fontFamily="monospace"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

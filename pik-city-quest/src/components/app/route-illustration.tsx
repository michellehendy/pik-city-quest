// Semi-realistic illustrated map of PIK with quest stops connected by a route (SVG, brand palette).
export function RouteIllustration({ className }: { className?: string }) {
  const stops = [
    { x: 540, y: 150, label: "Pantjoran PIK" }, { x: 470, y: 120, label: "Batavia PIK" }, { x: 380, y: 95, label: "Sunset Pier" },
    { x: 300, y: 125, label: "Land's End" }, { x: 235, y: 100, label: "Aloha" }, { x: 160, y: 70, label: "Dermaga CBD" }, { x: 70, y: 40, label: "Little Siam" },
  ];
  const path = stops.map((s, i) => `${i ? "L" : "M"}${s.x},${s.y}`).join(" ");
  return (
    <svg viewBox="0 0 600 200" className={className} role="img" aria-label="Illustrated route across PIK">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a86a0" stopOpacity=".0" /><stop offset="1" stopColor="#06323c" stopOpacity=".55" /></linearGradient>
        <linearGradient id="land" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9fe3e6" stopOpacity=".55" /><stop offset="1" stopColor="#c9f0f1" stopOpacity=".35" /></linearGradient>
      </defs>
      <rect width="600" height="200" fill="url(#sea)" />
      {/* coastline / islands */}
      <path d="M0,150 C60,130 90,170 150,145 C210,120 240,175 300,160 C360,145 380,175 440,165 C500,155 540,190 600,170 L600,200 L0,200 Z" fill="url(#land)" />
      <path d="M20,90 C60,60 110,75 150,55 C200,35 240,70 290,65 C330,60 350,30 400,45 C440,55 470,40 520,60 C560,75 580,100 600,95 L600,130 C560,135 520,115 470,130 C420,145 380,120 330,135 C280,150 240,120 190,120 C140,120 100,150 40,130 Z" fill="#ffffff" opacity=".12" />
      {/* wave lines */}
      {[30, 55, 180].map((y, i) => <path key={i} d={`M0,${y} q15,-6 30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0`} fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="1.5" />)}
      {/* route */}
      <path d={path} fill="none" stroke="#f8b818" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 7" />
      {stops.map((s, i) => (
        <g key={s.label}>
          <circle cx={s.x} cy={s.y} r="11" fill={i === 0 ? "#f8b818" : i === stops.length - 1 ? "#ff6b5b" : "#ffffff"} stroke="#087088" strokeWidth="3" />
          <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#0f2a33">{i + 1}</text>
          <text x={s.x} y={s.y - 17} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#ffffff">{s.label}</text>
        </g>
      ))}
      <text x="548" y="186" fontSize="9" fontWeight="800" fill="#ffffff" opacity=".8">PIK1 ▸</text>
      <text x="14" y="186" fontSize="9" fontWeight="800" fill="#ffffff" opacity=".8">◂ PIK2</text>
    </svg>
  );
}

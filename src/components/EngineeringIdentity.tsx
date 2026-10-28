/** Original decorative motif for the report; it is not the council's official seal. */
function gearOutline(cx: number, cy: number, root: number, tip: number, teeth = 12): string {
  const pitch = Math.PI * 2 / teeth;
  const vertices: string[] = [];
  for (let tooth = 0; tooth < teeth; tooth++) {
    for (const [offset, radius] of [[-.5, root], [-.32, root], [-.23, tip], [.23, tip], [.32, root], [.5, root]]) {
      const angle = tooth * pitch + offset * pitch - Math.PI / 2;
      vertices.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`);
    }
  }
  return vertices.join(' ');
}

export function EngineeringEmblem() {
  return <svg className="r9-brand-emblem" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <polygon className="r9-engineering-gear" points={gearOutline(32, 32, 23, 29)} fill="#FABD07" />
    <circle cx="32" cy="32" r="18" fill="#01224D" />
    <circle cx="32" cy="32" r="15" fill="none" stroke="#3182CE" strokeWidth=".8" />
    <path d="M21 44 32 19 43 44M25 35h14M19 44h26" fill="none" stroke="#FABD07" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 19v-4M21 44l-3 3M43 44l3 3" fill="none" stroke="#fff" strokeWidth="1" />
  </svg>;
}

export function EngineeringBlueprint() {
  return <svg className="r9-engineering-mark" viewBox="0 0 220 90" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth=".75">
      <polygon points={gearOutline(132, 45, 26, 32)} />
      <circle cx="132" cy="45" r="21" />
      <circle cx="132" cy="45" r="15" />
      <path d="M118 61 132 28 146 61M123 48h18M113 61h38M90 45h83M132 5v80" />
      <path d="M12 26h65l18 19M27 67h54l17-17M168 45h40M132 9h54M132 81h54M181 9v72M177 13l4-4 4 4M177 77l4 4 4-4" />
      <path d="M7 23v6M22 64v6M205 42v6M86 21h5M87 70h5" />
    </g>
    <circle cx="95" cy="45" r="2.5" fill="#FABD07" />
    <circle cx="168" cy="45" r="2.5" fill="#FABD07" />
    <circle cx="132" cy="28" r="1.8" fill="#3182CE" />
  </svg>;
}

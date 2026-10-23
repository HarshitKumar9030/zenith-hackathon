/** Small isometric SVG objects. Nest inside an existing decorative SVG. */
export default function DepthGlyph({ kind, x, y, delay = 0 }: { kind: "box" | "leaf" | "bottle"; x: number; y: number; delay?: number }) {
  return <g transform={`translate(${x} ${y})`} aria-hidden="true"><g className="depth-glyph-float" style={{ animationDelay: `${delay}s` }}>
    {kind === "box" ? <>
      <path d="M0 12 22 0 44 12 22 25Z" fill="#e4dccb" />
      <path d="M0 12 22 25v26L0 38Z" fill="#c8b695" />
      <path d="m22 25 22-13v26L22 51Z" fill="#a68f70" />
      <path d="m10 6 23 13v11l-8 5V23L3 10Z" fill="#f1e9d8" />
      <path d="m29 36 8-5m-8 10 8-5" stroke="#73624d" strokeWidth="1.5" strokeLinecap="round" />
    </> : kind === "leaf" ? <>
      <path d="M0 31C-1 9 16-4 44 2c4 27-14 47-36 36Z" fill="#a8be91" />
      <path d="M8 38C22 35 34 21 44 2 21 13 12 23 8 38Z" fill="#6c906c" />
      <path d="M3 46 34 13M15 33l-1-10m9 1 9 1" stroke="#3f6b50" strokeWidth="2" strokeLinecap="round" />
    </> : <>
      <path d="m12 8 16-3 7 7v10l9 12v32L17 73 5 65V35l7-13Z" fill="#c5d9ce" />
      <path d="m28 5 7 7v10l9 12v32L30 70V36l-7-12V10Z" fill="#86ad9c" />
      <path d="m9 38 21 4v18L9 56Z" fill="#f1f3e8" />
      <path d="m30 42 10-4v18l-10 4Z" fill="#cecbea" />
      <path d="m12 8 16-3 7 7-16 4-7-5Z" fill="#8d83b8" />
      <path d="m19 16 16-4v7l-16 4-7-5v-7Z" fill="#6b6292" />
      <path d="M12 30v6m0 24v4" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
    </>}
  </g></g>;
}

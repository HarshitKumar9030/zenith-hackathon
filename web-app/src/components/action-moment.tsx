import styles from "./action-moment.module.css";

export type ActionMomentKind = "pickup" | "reward" | "receipt";

/** One-shot feedback after a successful action; labels describe the actual saved state. */
export default function ActionMoment({ kind, label }: { kind: ActionMomentKind; label?: string }) {
  return <div className={styles.moment} data-action-moment={kind}>
    <svg className={styles.art} viewBox="0 0 220 180" fill="none" aria-hidden="true" focusable="false">
      <ellipse cx="110" cy="158" rx="67" ry="9" fill="#eaf0e7" />
      {kind === "pickup" ? <>
        <g className={styles.base}>
          <path d="m54 106 56-30 56 30-56 32Z" fill="#819780" />
          <path d="m54 106 56-30-17-16-56 30Z" fill="#e8dfcc" />
          <path d="m110 76 56 30 17-16-56-30Z" fill="#d3c2a3" />
        </g>
        <g className={styles.calendar}>
          <path d="m76 36 68-8 5 69-68 8Z" fill="#b2a2d3" />
          <path d="m72 31 68-8 5 69-68 8Z" fill="#f0edf7" />
          <path d="m72 31 68-8 2 20-68 8Z" fill="#7770aa" />
          <path d="m85 22 1 14m37-18 1 14" stroke="#3c3e65" strokeWidth="5" strokeLinecap="round" />
          <path d="m91 67 9 8 21-25" stroke="#658064" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className={styles.base}>
          <path d="m54 106 56 32v29l-56-31Z" fill="#d9c9ab" />
          <path d="m110 138 56-32v30l-56 31Z" fill="#b59e79" />
          <path d="m54 106 56 32-16 12-56-32Z" fill="#f1e7d4" />
          <path d="m110 138 56-32 16 12-56 32Z" fill="#ded0b6" />
        </g>
      </> : kind === "reward" ? <>
        <g className={styles.ticket}>
          <path d="m47 91 111-13 6 55-111 13-2-16c11-2 10-16-2-15Z" fill="#c4b8dd" />
          <path d="m43 85 111-13 6 55-111 13-2-16c11-2 10-16-2-15Z" fill="#ece7f5" />
          <path d="m122 78 6 52" stroke="#a49abf" strokeWidth="2" strokeDasharray="4 5" />
          <path d="m66 111 12 9 24-29" stroke="#7770aa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m139 93 1 14m-5-6 10-1" stroke="#9d91b8" strokeWidth="3" strokeLinecap="round" />
        </g>
        {[0, 1, 2].map((n) => <g key={n} className={`${styles.coin} ${styles[`coin${n}`]}`}>
          <ellipse cx={86+n*24} cy={39+n*4} rx="13" ry="16" fill="#a08e57" />
          <ellipse cx={82+n*24} cy={37+n*4} rx="13" ry="16" fill="#e5d59f" />
          <path d={`m${77+n*24} ${37+n*4} 4 4 7-9`} stroke="#9d8953" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>)}
      </> : <>
        <g className={styles.base}>
          <path d="m43 132 60-28 68 26-61 31Z" fill="#d9e3d3" />
          <path d="m43 132 67 29v10l-67-29Z" fill="#b8c8ae" />
          <path d="m110 161 61-31v10l-61 31Z" fill="#92aa8d" />
          <path d="m94 145 17 7 17-8-17-7Z" fill="#687d6b" />
        </g>
        <g className={styles.bag}>
          <path d="m83 46 33-4-6 16c3 10 31 35 21 56-8 17-53 20-64 4-14-20 12-48 19-59Z" fill="#98b18d" />
          <path d="m110 58c3 10 31 35 21 56-4 8-13 13-25 15 16-17 0-43-6-64Z" fill="#6e9169" />
          <path d="m83 60 26-3" stroke="#536d50" strokeWidth="5" strokeLinecap="round" />
          <path d="M85 91c11-11 25-3 19 7-6 9-17 7-19-7Z" fill="#dbe7ce" />
        </g>
        <g className={styles.receiptPaper}>
          <path d="m144 68 39 7-7 64-7-5-6 3-6-5-6 3-7-5-7 2Z" fill="#e6e0ef" />
          <path d="m140 65 39 7-7 64-7-5-6 3-6-5-6 3-7-5-7 2Z" fill="#faf8fc" />
          <path d="m149 81 20 4m-22 5 16 3" stroke="#b7accb" strokeWidth="3" strokeLinecap="round" />
          <path d="m146 108 5 6 12-12" stroke="#6c8b64" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </>}
      <g className={styles.check}>
        <circle cx="177" cy="46" r="17" fill="#dce9d3" />
        <path d="m169 46 6 6 10-12" stroke="#5c7d56" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
    {label ? <p className={styles.label} role="status">{label}</p> : null}
  </div>;
}

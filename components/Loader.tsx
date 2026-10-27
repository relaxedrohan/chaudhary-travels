"use client";

/** Same moment as the landing intro: wordmark rises and the rule keeps drawing. Removed instantly when ready. */
export function Loader() {
  return (
    <div role="status" aria-label="Loading" className="intro intro-staff">
      <div className="intro-inner">
        <p className="intro-mark">
          <span className="intro-line">
            <span style={{ "--d": "0ms" } as React.CSSProperties}>Chaudhary</span>
          </span>
          <span className="intro-line">
            <span style={{ "--d": "90ms" } as React.CSSProperties}>Travels</span>
          </span>
        </p>
        <div className="intro-rule intro-rule-loop" />
      </div>
    </div>
  );
}

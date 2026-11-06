'use client';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary !min-h-10 !py-2">
      Print
    </button>
  );
}

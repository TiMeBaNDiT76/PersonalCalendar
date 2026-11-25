import { useEffect, useRef } from 'react';

interface Props {
  years: number[];
  active: number;
  onChange: (year: number) => void;
}

/** Scrollbare Reiterzeile für 10 Jahre; aktives Jahr wird ins Blickfeld gescrollt. */
export default function YearTabs({ years, active, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-year="${active}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);

  return (
    <div className="tabs" ref={ref} role="tablist" aria-label="Jahre">
      {years.map((y) => (
        <button
          key={y}
          type="button"
          role="tab"
          aria-selected={y === active}
          data-year={y}
          className={y === active ? 'tab active' : 'tab'}
          onClick={() => onChange(y)}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

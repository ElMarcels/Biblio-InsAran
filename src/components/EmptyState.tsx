export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-hairline bg-surface px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center border-2 border-line font-display text-[22px] font-bold"
      >
        ∅
      </span>
      <h3 className="font-display text-[19px] font-semibold">{title}</h3>
      <p className="max-w-md text-[14px] text-ink-soft">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

import { classNames } from "@/lib/format";

type Tone = "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  info: "border-line bg-surface text-ink",
  success: "border-ok bg-ok-soft text-ok",
  warning: "border-warn bg-warn-soft text-warn",
  danger: "border-danger bg-danger-soft text-danger",
};

const ICONS: Record<Tone, string> = {
  info: "i",
  success: "✓",
  warning: "!",
  danger: "×",
};

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={classNames(
        "animate-fade-in-up flex items-start gap-3 border-2 px-3.5 py-2.5 text-[13.5px] font-medium",
        TONES[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="animate-pop mt-px flex size-5 shrink-0 items-center justify-center border-2 border-current text-[11px] font-bold"
      >
        {ICONS[tone]}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

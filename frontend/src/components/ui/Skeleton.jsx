import { cn } from "@/core/utils/cn.js";

const variants = {
  text: "h-4 w-full rounded",
  circular: "aspect-square rounded-full",
  rectangular: "min-h-4 w-full rounded-lg",
};

export default function Skeleton({
  variant = "text",
  count = 1,
  width,
  height,
  className,
}) {
  const items = Array.from({ length: Math.max(0, count) }, (_, index) => (
    <span
      key={index}
      aria-hidden="true"
      style={{ width, height }}
      className={cn(
        "block animate-pulse bg-slate-200",
        variants[variant] ?? variants.text,
        className,
      )}
    />
  ));

  if (count === 1) {
    return <span role="status" aria-label="Chargement">{items[0]}</span>;
  }

  return (
    <span
      role="status"
      aria-label="Chargement"
      className="flex flex-col gap-2"
    >
      {items}
    </span>
  );
}

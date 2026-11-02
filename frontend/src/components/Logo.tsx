import { cn } from "@/lib/utils";

const sources = {
  lockup: { src: "/logo.png", ratio: "287 / 68" },
  mark: { src: "/logo-mark.png", ratio: "1 / 1" },
} as const;

export function Logo({
  variant = "lockup",
  className,
}: {
  variant?: keyof typeof sources;
  className?: string;
}) {
  const { src, ratio } = sources[variant];
  return (
    <span
      role="img"
      aria-label="Impact One"
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        aspectRatio: ratio,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

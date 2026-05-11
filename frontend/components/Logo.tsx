export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const className =
    size === "sm"
      ? "logo logo-sm"
      : size === "lg"
        ? "logo logo-lg"
        : "logo";

  return (
    <div className={className} aria-label="A to ㄱ">
      <svg viewBox="0 0 120 80" className="logo-mark">
        <path
          d="M10 65 C 24 18, 42 -8, 62 38 S 92 81, 110 18"
          stroke="black"
          strokeWidth="15"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

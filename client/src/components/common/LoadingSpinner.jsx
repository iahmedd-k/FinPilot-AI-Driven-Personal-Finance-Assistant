export default function LoadingSpinner({ size = "md" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-[3px]",
  };

  return (
    <div
      className={`${sizes[size]} rounded-full border-white/10 border-t-teal animate-spin`}
      style={{ borderTopColor: "#2dd4bf" }}
    />
  );
}
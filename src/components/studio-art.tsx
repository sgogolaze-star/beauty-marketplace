export function StudioArt({
  category,
  large = false,
}: {
  category: string;
  large?: boolean;
}) {
  const tone =
    category === "Skin" ? "peach" : category === "Nails" ? "green" : "lilac";
  return (
    <div
      className={`studio-art ${tone} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <div className="art-arch">
        <div className="art-mirror" />
        <div className="art-shelf" />
        <div className="art-bottle" />
        <div className="art-vase" />
        <div className="art-chair" />
      </div>
      <span className="art-grain" />
    </div>
  );
}

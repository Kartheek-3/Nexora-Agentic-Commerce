export function NexoraBackground() {
  return (
    <div aria-hidden="true" className="nexora-background">
      <div className="nexora-background__grid" />
      <div className="nexora-background__glow nexora-background__glow--violet" />
      <div className="nexora-background__glow nexora-background__glow--cyan" />
      <div className="nexora-background__stars" />
    </div>
  );
}

export const AmbientLayer = NexoraBackground;

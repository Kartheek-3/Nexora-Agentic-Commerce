import { CommerceCore } from "../three/CommerceCore";

export function AuthVisual() {
  return (
    <div className="nx-auth-orbit p-4">
      <CommerceCore compact variant="compact" showLabels={false} className="h-full min-h-[240px] opacity-80" />
    </div>
  );
}

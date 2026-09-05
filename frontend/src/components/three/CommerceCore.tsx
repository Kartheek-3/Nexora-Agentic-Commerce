import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, Line, OrbitControls, Sphere, Stars } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { Vector3 } from "three";
import { cn } from "../../lib/utils";

type CoreState = "idle" | "success" | "failure";
type CoreVariant = "hero" | "ambient" | "compact";

function Packet({ color, index }: { color: string; index: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = Math.sin(clock.elapsedTime * 1.6 + index) * 0.36;
    ref.current.position.y = Math.cos(clock.elapsedTime * 1.2 + index) * 0.18 - 0.3;
  });
  return (
    <Sphere ref={ref} args={[0.045, 16, 16]}>
      <meshBasicMaterial color={color} />
    </Sphere>
  );
}

function Network({ state, reduced, showLabels, variant }: { state: CoreState; reduced: boolean; showLabels: boolean; variant: CoreVariant }) {
  const group = useRef<Group>(null);
  const core = useRef<Group>(null);
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const ringC = useRef<Mesh>(null);
  const nodes = useMemo(
    () => [
      { label: "CUSTOMER", position: new Vector3(-2.05, 0.72, 0), labelOffset: new Vector3(0.2, 0.43, 0) },
      { label: "AI AGENT", position: new Vector3(0, 1.62, -0.12), labelOffset: new Vector3(0, 0.42, 0) },
      { label: "MERCHANT", position: new Vector3(2.05, 0.68, 0), labelOffset: new Vector3(-0.2, 0.43, 0) },
      { label: "RAZORPAY", position: new Vector3(0, -1.42, 0.12), labelOffset: new Vector3(0, 0.46, 0) },
    ],
    [],
  );
  const color = state === "failure" ? "#FF5D73" : state === "success" ? "#32D583" : "#7C6CFF";
  const particleCount = variant === "hero" ? 520 : variant === "compact" ? 180 : 120;
  const rotationSpeed = variant === "hero" ? 0.0018 : variant === "compact" ? 0.0009 : 0.00065;
  const sceneScale = variant === "hero" ? 1 : variant === "compact" ? 0.82 : 0.9;

  useFrame(({ pointer, clock }) => {
    if (!group.current) return;
    group.current.rotation.y += reduced ? 0 : rotationSpeed;
    group.current.rotation.y += reduced || variant === "ambient" ? 0 : pointer.x * 0.0004;
    group.current.rotation.x = reduced ? 0 : pointer.y * 0.035;
    if (core.current) {
      const breath = reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 1.2) * 0.025;
      core.current.scale.setScalar(breath);
    }
    if (ringA.current) ringA.current.rotation.z += reduced ? 0 : 0.002;
    if (ringB.current) ringB.current.rotation.x += reduced ? 0 : 0.0014;
    if (ringC.current) ringC.current.rotation.y -= reduced ? 0 : 0.001;
  });

  return (
    <group ref={group} scale={sceneScale}>
      <ambientLight intensity={0.8} />
      <pointLight position={[3, 4, 5]} intensity={4} color="#48E0FF" />
      <Stars radius={45} depth={20} count={reduced ? 80 : particleCount} factor={variant === "hero" ? 2.5 : 1.6} fade speed={reduced ? 0 : 0.18} />
      <Float speed={1.4} rotationIntensity={reduced ? 0 : 0.18} floatIntensity={reduced ? 0 : 0.22}>
        <group ref={core}>
        <mesh ref={ringA} rotation={[Math.PI / 2.1, 0.18, 0]}>
          <torusGeometry args={[1.14, 0.018, 16, 128]} />
          <meshPhysicalMaterial color="#32364A" roughness={0.24} metalness={0.92} clearcoat={0.7} />
        </mesh>
        <mesh ref={ringB} rotation={[0.18, Math.PI / 2.4, 0.6]}>
          <torusGeometry args={[1.42, 0.012, 16, 128]} />
          <meshPhysicalMaterial color="#181B27" roughness={0.18} metalness={0.86} clearcoat={1} />
        </mesh>
        <mesh ref={ringC} rotation={[0.8, 0.2, Math.PI / 2]}>
          <torusGeometry args={[0.92, 0.01, 12, 96]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} roughness={0.35} metalness={0.35} />
        </mesh>
        <Sphere args={[0.72, 48, 48]}>
          <meshPhysicalMaterial color="#10121A" roughness={0.22} metalness={0.75} clearcoat={1} emissive={color} emissiveIntensity={0.2} />
        </Sphere>
        <Sphere args={[0.38, 40, 40]}>
          <meshPhysicalMaterial color="#8B7CFF" roughness={0.18} metalness={0.2} transmission={0.28} transparent opacity={0.34} emissive={color} emissiveIntensity={state === "success" ? 1.1 : 0.55} />
        </Sphere>
        </group>
      </Float>
      {nodes.map((node, index) => (
        <group key={node.label} position={node.position}>
          <Sphere args={[0.19, 32, 32]}>
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.25} emissive={color} emissiveIntensity={0.8} />
          </Sphere>
          {showLabels ? (
            <Html center position={node.labelOffset} transform={false} occlude={false} pointerEvents="none" zIndexRange={[10, 0]}>
              <span className="commerce-node-label">
                {node.label}
              </span>
            </Html>
          ) : null}
          <Line points={[new Vector3(0, 0, 0), new Vector3(-node.position.x, -node.position.y, -node.position.z)]} color={color} transparent opacity={state === "success" ? 0.86 : 0.42} lineWidth={1.4} />
          {!reduced ? <Packet color={color} index={index} /> : null}
        </group>
      ))}
    </group>
  );
}

export function CommerceCore({
  state = "idle",
  compact = false,
  variant,
  showLabels,
  className,
}: {
  state?: CoreState;
  compact?: boolean;
  variant?: CoreVariant;
  showLabels?: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const resolvedVariant = variant ?? (compact ? "compact" : "hero");
  const labelsVisible = showLabels ?? resolvedVariant === "hero";

  useEffect(() => {
    setMounted(true);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const sync = () => setReduced(motionQuery.matches || mobileQuery.matches);
    sync();
    motionQuery.addEventListener("change", sync);
    mobileQuery.addEventListener("change", sync);
    return () => {
      motionQuery.removeEventListener("change", sync);
      mobileQuery.removeEventListener("change", sync);
    };
  }, []);

  const supportsWebGL = mounted && "WebGLRenderingContext" in window;
  if (!mounted || !supportsWebGL) {
    return <div className="glass grid h-full min-h-72 place-items-center rounded-lg text-sm text-ivory/[0.64]">Commerce network visualization unavailable.</div>;
  }
  return (
    <div className={cn(compact ? "relative h-72 w-full overflow-visible" : "relative h-[380px] w-full overflow-visible sm:h-[430px] md:h-[560px]", className)}>
      <Canvas camera={{ position: [0, 0.28, compact ? 7.4 : 7.15], fov: compact ? 43 : 41 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <Network state={state} reduced={reduced} showLabels={labelsVisible} variant={resolvedVariant} />
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Suspense>
      </Canvas>
    </div>
  );
}

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Html } from "@react-three/drei";
import * as THREE from "three";

const GlobeMesh = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.15;
    if (pointsRef.current) pointsRef.current.rotation.y += delta * 0.15;
  });

  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const count = 2000;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = 1.52;
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  const arcsData = useMemo(() => {
    const arcs: { curve: THREE.CatmullRomCurve3 }[] = [];
    const pairs = [
      [[-0.8, 0.9, 0.8], [0.6, 0.7, -1.0]],
      [[1.0, -0.3, 0.7], [-0.5, 0.5, 1.1]],
      [[-1.1, -0.5, -0.5], [0.9, 0.2, 0.9]],
      [[0.3, 1.1, 0.6], [-0.7, -0.8, 0.8]],
      [[0.8, 0.5, -0.9], [-0.4, 1.0, 0.5]],
    ];
    for (const [s, e] of pairs) {
      const start = new THREE.Vector3(...s).normalize().multiplyScalar(1.52);
      const end = new THREE.Vector3(...e).normalize().multiplyScalar(1.52);
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(2.4);
      arcs.push({ curve: new THREE.CatmullRomCurve3([start, mid, end], false, "catmullrom", 0.5) });
    }
    return arcs;
  }, []);

  return (
    <group>
      <Sphere ref={meshRef} args={[1.5, 64, 64]}>
        <meshStandardMaterial
          color="#1a3a5c"
          transparent
          opacity={0.35}
          wireframe={false}
        />
      </Sphere>

      {/* Wireframe overlay */}
      <Sphere args={[1.51, 32, 32]}>
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.08} />
      </Sphere>

      {/* Dots on surface */}
      <points ref={pointsRef} geometry={pointsGeometry}>
        <pointsMaterial color="#60a5fa" size={0.015} transparent opacity={0.7} sizeAttenuation />
      </points>

      {/* Connection arcs */}
      {arcsData.map((arc, i) => {
        const points = arc.curve.getPoints(50);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <primitive key={i} object={new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: "#f59e0b", transparent: true, opacity: 0.6 }))} />
        );
      })}

      {/* Glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.75, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const InteractiveGlobe = () => {
  return (
    <div className="w-full h-[350px] md:h-[420px] relative">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, 5]} intensity={0.3} color="#3b82f6" />
        <GlobeMesh />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={(2 * Math.PI) / 3}
        />
      </Canvas>
    </div>
  );
};

export default InteractiveGlobe;

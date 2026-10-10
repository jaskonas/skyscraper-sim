import { LANDMARK_POSITION } from './layout';

/** A simple silhouette of a famous local building on the skyline behind the diorama. */
export function Landmark({ kind }: { kind: string }) {
  return (
    <group name={`landmark-${kind}`} position={LANDMARK_POSITION}>
      {kind === 'empire-state' && (
        <>
          <mesh position={[0, 90, 0]} scale={[40, 180, 40]}><boxGeometry /><meshStandardMaterial color="#b8ae9c" flatShading /></mesh>
          <mesh position={[0, 210, 0]} scale={[24, 60, 24]}><boxGeometry /><meshStandardMaterial color="#c4bba9" flatShading /></mesh>
          <mesh position={[0, 265, 0]}><coneGeometry args={[4, 50, 8]} /><meshStandardMaterial color="#d8d2c4" flatShading /></mesh>
        </>
      )}
      {kind === 'tokyo-tower' && (
        <>
          <mesh position={[0, 165, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[34, 330, 4]} /><meshStandardMaterial color="#e2512f" flatShading /></mesh>
          <mesh position={[0, 150, 0]} scale={[22, 8, 22]}><boxGeometry /><meshStandardMaterial color="#f4f4f4" flatShading /></mesh>
        </>
      )}
      {kind === 'willis' &&
        [440, 400, 360, 270, 440, 330, 270, 400, 360].map((h, i) => (
          <mesh key={i} position={[(i % 3) * 23 - 23, h / 2, Math.floor(i / 3) * 23 - 23]} scale={[22.5, h, 22.5]}>
            <boxGeometry />
            <meshStandardMaterial color="#2d3035" flatShading />
          </mesh>
        ))}
      {kind === 'pearl-tower' && (
        <>
          <mesh position={[0, 230, 0]}><cylinderGeometry args={[5, 7, 460, 12]} /><meshStandardMaterial color="#c9c9cf" flatShading /></mesh>
          <mesh position={[0, 100, 0]}><sphereGeometry args={[25, 16, 12]} /><meshStandardMaterial color="#c2457a" flatShading /></mesh>
          <mesh position={[0, 270, 0]}><sphereGeometry args={[16, 16, 12]} /><meshStandardMaterial color="#c2457a" flatShading /></mesh>
        </>
      )}
    </group>
  );
}

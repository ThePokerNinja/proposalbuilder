import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Task } from '../types';

interface Sphere3DVisualizationProps {
  tasks: Task[];
  onTaskHoursChange: (taskId: string, hours: number) => void;
}

interface MilestoneSphereProps {
  position: [number, number, number];
  hours: number;
  name: string;
  category: string;
  color: string;
  onHoursChange: (hours: number) => void;
}

function MilestoneSphere({ position, hours, name, category, color, onHoursChange }: MilestoneSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate radius from hours (volume = 4/3 * π * r³)
  // Using a scale factor to make spheres visible
  const volume = hours;
  const radius = Math.cbrt((volume * 3) / (4 * Math.PI)) * 0.15; // Scale factor for visibility
  const minRadius = 0.5;
  const maxRadius = 3;
  const clampedRadius = Math.max(minRadius, Math.min(maxRadius, radius));

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          // Increase hours on click (example interaction)
          const newHours = hours + 10;
          onHoursChange(newHours);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[clampedRadius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Text
        position={[0, clampedRadius + 0.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name}
      </Text>
      <Text
        position={[0, clampedRadius + 0.2, 0]}
        fontSize={0.2}
        color="#e0e0e0"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {Math.round(hours)}h
      </Text>
    </group>
  );
}

interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  startRadius: number;
  endRadius: number;
}

function ConnectionLine({ start, end, startRadius, endRadius }: ConnectionLineProps) {
  const points = useMemo(() => {
    const startPoint = new THREE.Vector3(...start);
    const endPoint = new THREE.Vector3(...end);
    
    // Adjust start and end points to be on sphere surfaces
    const direction = endPoint.clone().sub(startPoint).normalize();
    const adjustedStart = startPoint.clone().add(direction.clone().multiplyScalar(startRadius));
    const adjustedEnd = endPoint.clone().sub(direction.clone().multiplyScalar(endRadius));
    
    return [adjustedStart, adjustedEnd];
  }, [start, end, startRadius, endRadius]);

  return (
    <Line
      points={points}
      color="#4a90e2"
      lineWidth={2}
      transparent
      opacity={0.4}
    />
  );
}

function Scene({ tasks, onTaskHoursChange }: Sphere3DVisualizationProps) {
  // Group tasks by category/milestone
  const milestones = useMemo(() => {
    const categoryMap = new Map<string, { tasks: Task[]; totalHours: number }>();
    
    tasks.forEach((task) => {
      const existing = categoryMap.get(task.category) || { tasks: [], totalHours: 0 };
      existing.tasks.push(task);
      existing.totalHours += task.baseHours * task.multiplier;
      categoryMap.set(task.category, existing);
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalHours: data.totalHours,
        tasks: data.tasks,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [tasks]);

  // Generate positions in a cluster formation
  const positions = useMemo(() => {
    const count = milestones.length;
    const positions: [number, number, number][] = [];
    
    if (count === 1) {
      positions.push([0, 0, 0]);
    } else if (count === 2) {
      positions.push([-2, 0, 0], [2, 0, 0]);
    } else if (count === 3) {
      positions.push([0, 2, 0], [-2, -1, 0], [2, -1, 0]);
    } else if (count === 4) {
      positions.push([-2, 1, 0], [2, 1, 0], [-2, -1, 0], [2, -1, 0]);
    } else {
      // Circular arrangement for more milestones
      const radius = 3;
      milestones.forEach((_, index) => {
        const angle = (index / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 2;
        positions.push([x, y, z]);
      });
    }
    
    return positions;
  }, [milestones.length]);

  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // green
    '#ef4444', // red
    '#06b6d4', // cyan
    '#f97316', // orange
  ];

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {milestones.map((milestone, index) => {
        const position = positions[index];
        const color = colors[index % colors.length];
        const volume = milestone.totalHours;
        const radius = Math.max(0.5, Math.min(3, Math.cbrt((volume * 3) / (4 * Math.PI)) * 0.15));

        return (
          <React.Fragment key={milestone.category}>
            <MilestoneSphere
              position={position}
              hours={milestone.totalHours}
              name={milestone.category}
              category={milestone.category}
              color={color}
              onHoursChange={(newHours) => {
                // Distribute hours change proportionally across tasks in this milestone
                if (milestone.totalHours > 0) {
                  const ratio = newHours / milestone.totalHours;
                  milestone.tasks.forEach((task) => {
                    const newTaskHours = (task.baseHours * task.multiplier) * ratio;
                    onTaskHoursChange(task.id, newTaskHours);
                  });
                }
              }}
            />
            {/* Connect to other spheres */}
            {index < milestones.length - 1 && (
              <ConnectionLine
                start={position}
                end={positions[index + 1]}
                startRadius={radius}
                endRadius={Math.max(0.5, Math.min(3, Math.cbrt((milestones[index + 1].totalHours * 3) / (4 * Math.PI)) * 0.15))}
              />
            )}
          </React.Fragment>
        );
      })}
      
      {/* Connect first to last for circular arrangement */}
      {milestones.length > 2 && (
        <ConnectionLine
          start={positions[0]}
          end={positions[positions.length - 1]}
          startRadius={Math.max(0.5, Math.min(3, Math.cbrt((milestones[0].totalHours * 3) / (4 * Math.PI)) * 0.15))}
          endRadius={Math.max(0.5, Math.min(3, Math.cbrt((milestones[milestones.length - 1].totalHours * 3) / (4 * Math.PI)) * 0.15))}
        />
      )}
    </>
  );
}

export function Sphere3DVisualization({ tasks, onTaskHoursChange }: Sphere3DVisualizationProps) {
  // Filter to only selected tasks
  const selectedTasks = tasks.filter(t => t.selected !== false);
  
  if (selectedTasks.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 shadow-lg border-2 border-gray-700 h-[600px] relative flex items-center justify-center">
        <p className="text-white/70 text-lg">Select tasks to see 3D visualization</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-lg border-2 border-gray-700 h-[600px] relative">
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
        <h3 className="text-white font-bold text-lg mb-1">3D Milestone Visualization</h3>
        <p className="text-white/70 text-xs">Click spheres to adjust hours • Drag to rotate • Scroll to zoom</p>
      </div>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 50 }}
        style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
        gl={{ antialias: true }}
      >
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={30}
        />
        <Scene tasks={selectedTasks} onTaskHoursChange={onTaskHoursChange} />
      </Canvas>
    </div>
  );
}

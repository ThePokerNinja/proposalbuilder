// This component is currently disabled due to missing dependencies
// Uncomment when @react-three/fiber, @react-three/drei, and three are installed

import { Task } from '../types';

interface Sphere3DVisualizationProps {
  tasks: Task[];
  onTaskHoursChange: (taskId: string, hours: number) => void;
}

export function Sphere3DVisualization(_props: Sphere3DVisualizationProps) {
  // Component disabled - dependencies not installed
  return (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
      <p className="text-gray-500 text-sm">3D Visualization temporarily disabled</p>
    </div>
  );
}

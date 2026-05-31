import { motion } from "motion/react";
import { useMemo } from "react";

export function NeuralNetwork() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Generate random network paths
  const paths = useMemo(() => {
    if (reducedMotion) return [];

    return Array.from({ length: 15 }, (_, i) => {
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const controlX1 = Math.random() * 100;
      const controlY1 = Math.random() * 100;
      const controlX2 = Math.random() * 100;
      const controlY2 = Math.random() * 100;
      const endX = Math.random() * 100;
      const endY = Math.random() * 100;

      return {
        d: `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`,
        delay: i * 0.5,
        duration: 15 + Math.random() * 10,
        opacity: 0.1 + Math.random() * 0.15,
      };
    });
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          {/* Glow filter for paths */}
          <filter id="neural-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for paths */}
          <linearGradient id="neural-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.6)" />
            <stop offset="50%" stopColor="rgba(139, 92, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(236, 72, 153, 0.6)" />
          </linearGradient>

          <linearGradient id="neural-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(6, 182, 212, 0.6)" />
            <stop offset="50%" stopColor="rgba(139, 92, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
          </linearGradient>
        </defs>

        {paths.map((path, i) => (
          <motion.path
            key={i}
            d={path.d}
            fill="none"
            stroke={i % 2 === 0 ? "url(#neural-gradient-1)" : "url(#neural-gradient-2)"}
            strokeWidth="0.15"
            filter="url(#neural-glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 0],
              opacity: [0, path.opacity, 0],
            }}
            transition={{
              duration: path.duration,
              delay: path.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>

      {/* Floating particles */}
      {Array.from({ length: 30 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(${
              i % 3 === 0 ? "59, 130, 246" : i % 3 === 1 ? "139, 92, 246" : "236, 72, 153"
            }, 0.6)`,
            boxShadow: `0 0 ${4 + Math.random() * 8}px rgba(${
              i % 3 === 0 ? "59, 130, 246" : i % 3 === 1 ? "139, 92, 246" : "236, 72, 153"
            }, 0.8)`,
          }}
          animate={{
            y: [0, -100 - Math.random() * 200],
            x: [0, (Math.random() - 0.5) * 100],
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 12,
            delay: i * 0.3,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Energy orbs */}
      {Array.from({ length: 8 }, (_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            width: 100 + Math.random() * 200,
            height: 100 + Math.random() * 200,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `radial-gradient(circle, rgba(${
              i % 3 === 0 ? "59, 130, 246" : i % 3 === 1 ? "139, 92, 246" : "6, 182, 212"
            }, 0.15) 0%, transparent 70%)`,
            filter: "blur(40px)",
          }}
          animate={{
            x: [0, (Math.random() - 0.5) * 200],
            y: [0, (Math.random() - 0.5) * 200],
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            delay: i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

import { motion } from "motion/react";
import { ReactNode } from "react";

interface HolographicCardProps {
  children: ReactNode;
  className?: string;
  intensity?: "subtle" | "medium" | "strong";
  animated?: boolean;
}

export function HolographicCard({
  children,
  className = "",
  intensity = "subtle",
  animated = true,
}: HolographicCardProps) {
  const intensityStyles = {
    subtle: "opacity-30",
    medium: "opacity-50",
    strong: "opacity-70",
  };

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      initial={animated ? { opacity: 0, y: 20 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {/* Holographic glow border */}
      <div
        className={`absolute inset-0 rounded-[inherit] ${intensityStyles[intensity]}`}
        style={{
          background: `linear-gradient(135deg,
            rgba(147, 51, 234, 0.3) 0%,
            rgba(236, 72, 153, 0.3) 25%,
            rgba(59, 130, 246, 0.3) 50%,
            rgba(147, 51, 234, 0.3) 75%,
            rgba(236, 72, 153, 0.3) 100%)`,
          backgroundSize: "200% 200%",
          animation: "holographic-flow 8s ease infinite",
          filter: "blur(20px)",
        }}
      />

      {/* Animated light streak */}
      {animated && (
        <motion.div
          className="absolute inset-0 rounded-[inherit]"
          style={{
            background: `linear-gradient(90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.1) 50%,
              transparent 100%)`,
          }}
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 5,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Corner glow effects */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
    </motion.div>
  );
}

// Floating holographic effect
export function FloatingHolographic({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Floating glow */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] blur-xl"
        style={{
          background: `radial-gradient(circle,
            rgba(147, 51, 234, 0.4) 0%,
            rgba(236, 72, 153, 0.2) 50%,
            transparent 100%)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// Neon glow border component
export function NeonBorder({
  children,
  className = "",
  color = "purple",
}: {
  children: ReactNode;
  className?: string;
  color?: "purple" | "pink" | "blue" | "green";
}) {
  const colorMap = {
    purple: "rgba(147, 51, 234, 0.6)",
    pink: "rgba(236, 72, 153, 0.6)",
    blue: "rgba(59, 130, 246, 0.6)",
    green: "rgba(34, 197, 94, 0.6)",
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: `linear-gradient(135deg, ${colorMap[color]}, transparent)`,
          padding: "2px",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          animation: "neon-pulse 2s ease-in-out infinite",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

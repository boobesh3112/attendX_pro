import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

interface AuroraBackgroundProps {
  className?: string;
}

export function AnimatedBackground({ className = "" }: AuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const animationFrameRef = useRef<number>();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    // Aurora wave configuration
    const waves = [
      { x: 0, y: 0, angle: 0, speed: 0.0003, color: [59, 130, 246], amplitude: 120, frequency: 0.0015 },
      { x: 0, y: 0, angle: Math.PI / 3, speed: 0.0004, color: [139, 92, 246], amplitude: 100, frequency: 0.0012 },
      { x: 0, y: 0, angle: Math.PI / 2, speed: 0.00025, color: [236, 72, 153], amplitude: 140, frequency: 0.001 },
      { x: 0, y: 0, angle: Math.PI, speed: 0.00035, color: [6, 182, 212], amplitude: 110, frequency: 0.0018 },
    ];

    // Network nodes
    const nodeCount = reducedMotion ? 0 : 25;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Clear with deep black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);

      if (reducedMotion) {
        // Static gradient for reduced motion
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.5);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.08)");
        gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.05)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        return;
      }

      time += 1;

      // Draw aurora waves
      waves.forEach((wave, index) => {
        wave.angle += wave.speed;

        const centerX = w / 2 + Math.cos(wave.angle) * (w * 0.3);
        const centerY = h / 2 + Math.sin(wave.angle) * (h * 0.3);

        // Create radial gradient for each wave
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          wave.amplitude * 4
        );

        const [r, g, b] = wave.color;
        const opacity = 0.15 + Math.sin(time * 0.001 + index) * 0.05;

        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`);
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      });

      // Secondary flowing gradients
      const flowGradient = ctx.createLinearGradient(
        w * (0.5 + Math.cos(time * 0.0002) * 0.3),
        0,
        w * (0.5 + Math.sin(time * 0.0002) * 0.3),
        h
      );
      flowGradient.addColorStop(0, "rgba(139, 92, 246, 0.06)");
      flowGradient.addColorStop(0.5, "rgba(236, 72, 153, 0.04)");
      flowGradient.addColorStop(1, "rgba(6, 182, 212, 0.06)");
      ctx.fillStyle = flowGradient;
      ctx.fillRect(0, 0, w, h);

      // Update and draw network nodes
      ctx.globalCompositeOperation = "lighter";

      nodes.forEach((node) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Wrap around edges
        if (node.x < 0) node.x = w;
        if (node.x > w) node.x = 0;
        if (node.y < 0) node.y = h;
        if (node.y > h) node.y = 0;

        // Pulse effect
        node.pulsePhase += 0.02;
        const pulse = Math.sin(node.pulsePhase) * 0.3 + 0.7;

        // Draw node
        const nodeGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3);
        nodeGradient.addColorStop(0, `rgba(139, 192, 246, ${node.opacity * pulse})`);
        nodeGradient.addColorStop(0.5, `rgba(139, 192, 246, ${node.opacity * pulse * 0.4})`);
        nodeGradient.addColorStop(1, "rgba(139, 192, 246, 0)");

        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections between nearby nodes
      ctx.strokeStyle = "rgba(139, 192, 246, 0.15)";
      ctx.lineWidth = 0.5;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const opacity = (1 - dist / 150) * 0.3;
            ctx.strokeStyle = `rgba(139, 192, 246, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();

            // Energy pulse along connection
            if (Math.random() < 0.01) {
              const pulsePos = Math.random();
              const pulseX = nodes[i].x + dx * pulsePos;
              const pulseY = nodes[i].y + dy * pulsePos;

              const pulseGradient = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 5);
              pulseGradient.addColorStop(0, "rgba(236, 72, 153, 0.6)");
              pulseGradient.addColorStop(1, "rgba(236, 72, 153, 0)");

              ctx.fillStyle = pulseGradient;
              ctx.beginPath();
              ctx.arc(pulseX, pulseY, 5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      ctx.globalCompositeOperation = "source-over";

      if (isVisible) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    // Handle visibility change
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start animation
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", updateSize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible, reducedMotion]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 pointer-events-none ${className}`}
        style={{ zIndex: 0 }}
      />

      {/* Additional CSS-based glow layers */}
      {!reducedMotion && (
        <>
          <motion.div
            className="fixed inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 30% 40%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)",
              zIndex: 1,
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="fixed inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 70% 60%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)",
              zIndex: 1,
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [1.1, 1, 1.1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
          <motion.div
            className="fixed inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 40%)",
              zIndex: 1,
            }}
            animate={{
              opacity: [0.6, 0.9, 0.6],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4,
            }}
          />
        </>
      )}
    </>
  );
}

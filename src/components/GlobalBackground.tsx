import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { themeSystem, type ThemeMode } from "../utils/themeSystem";

/**
 * Global Background Manager
 * Handles Light gradient, Dark gradient, and AMOLED animated aurora
 * Stays mounted globally - never recreated during navigation
 */

export function GlobalBackground() {
  const [theme, setTheme] = useState<ThemeMode>(themeSystem.getTheme());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const isAnimatingRef = useRef(false);
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = themeSystem.subscribe((newTheme) => {
      setTheme(newTheme);
    });

    return unsubscribe;
  }, []);

  // AMOLED Aurora Animation
  useEffect(() => {
    if (theme !== "amoled") {
      // Stop animation if not in AMOLED mode
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      isAnimatingRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true, // Better performance
      willReadFrequently: false
    });
    if (!ctx) return;

    // Performance scaling based on device
    const getPerformanceLevel = (): "high" | "medium" | "low" => {
      const memory = (navigator as any).deviceMemory;
      const cores = navigator.hardwareConcurrency || 4;

      if (memory && memory < 4) return "low";
      if (cores < 4) return "medium";
      return "high";
    };

    const perfLevel = reducedMotion ? "low" : getPerformanceLevel();

    // Adaptive settings based on performance
    const config = {
      high: { nodes: 30, waves: 4, particles: 40, blur: 20 },
      medium: { nodes: 20, waves: 3, particles: 25, blur: 15 },
      low: { nodes: 10, waves: 2, particles: 15, blur: 10 },
    }[perfLevel];

    // Set canvas size with device pixel ratio
    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };
    updateSize();

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateSize, 250);
    };
    window.addEventListener("resize", handleResize);

    // Aurora wave configuration
    const waves = Array.from({ length: config.waves }, (_, i) => ({
      x: 0,
      y: 0,
      angle: (Math.PI / config.waves) * i,
      speed: 0.0003 + Math.random() * 0.0002,
      color: [
        [59, 130, 246],   // Blue
        [139, 92, 246],   // Purple
        [236, 72, 153],   // Pink
        [6, 182, 212],    // Cyan
      ][i % 4],
      amplitude: 100 + Math.random() * 40,
      frequency: 0.001 + Math.random() * 0.0008,
    }));

    // Network nodes
    const nodes = Array.from({ length: config.nodes }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.2,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    // Particles
    const particles = Array.from({ length: config.particles }, () => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + Math.random() * 100,
      vy: -0.5 - Math.random() * 1,
      vx: (Math.random() - 0.5) * 0.5,
      life: Math.random(),
      maxLife: 0.8 + Math.random() * 0.4,
      size: Math.random() * 2 + 0.5,
      color: [
        [59, 130, 246],
        [139, 92, 246],
        [236, 72, 153],
      ][Math.floor(Math.random() * 3)],
    }));

    // Animation loop with auto-recovery
    let frameCount = 0;
    let lastRecoveryCheck = Date.now();

    const render = (currentTime: number) => {
      // Calculate delta time for smooth animation
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      // Auto-recovery: detect frozen frames
      if (deltaTime > 1000) {
        console.warn("Animation recovered from freeze");
        timeRef.current = currentTime;
      }

      // Auto-recovery: detect stopped animation
      frameCount++;
      if (Date.now() - lastRecoveryCheck > 5000) {
        if (frameCount < 60) {
          console.warn("Low frame rate detected, attempting recovery");
          isAnimatingRef.current = false;
          setTimeout(() => {
            if (!isAnimatingRef.current && theme === "amoled") {
              isAnimatingRef.current = true;
              animationFrameRef.current = requestAnimationFrame(render);
            }
          }, 100);
        }
        frameCount = 0;
        lastRecoveryCheck = Date.now();
      }

      if (!isAnimatingRef.current || theme !== "amoled") return;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Clear with deep black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);

      timeRef.current += deltaTime * 0.001;
      const time = timeRef.current;

      // Draw aurora waves
      waves.forEach((wave, index) => {
        wave.angle += wave.speed;

        const centerX = w / 2 + Math.cos(wave.angle) * (w * 0.25);
        const centerY = h / 2 + Math.sin(wave.angle) * (h * 0.25);

        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          wave.amplitude * 5
        );

        const [r, g, b] = wave.color;
        const opacity = 0.12 + Math.sin(time + index) * 0.04;

        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`);
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      });

      // Flowing gradients
      const flowGradient = ctx.createLinearGradient(
        w * (0.5 + Math.cos(time * 0.15) * 0.3),
        0,
        w * (0.5 + Math.sin(time * 0.15) * 0.3),
        h
      );
      flowGradient.addColorStop(0, "rgba(139, 92, 246, 0.05)");
      flowGradient.addColorStop(0.5, "rgba(236, 72, 153, 0.03)");
      flowGradient.addColorStop(1, "rgba(6, 182, 212, 0.05)");
      ctx.fillStyle = flowGradient;
      ctx.fillRect(0, 0, w, h);

      // Update and draw nodes
      ctx.globalCompositeOperation = "lighter";

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0) node.x = w;
        if (node.x > w) node.x = 0;
        if (node.y < 0) node.y = h;
        if (node.y > h) node.y = 0;

        node.pulsePhase += 0.015;
        const pulse = Math.sin(node.pulsePhase) * 0.3 + 0.7;

        const nodeGradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          node.radius * 4
        );
        nodeGradient.addColorStop(0, `rgba(139, 192, 246, ${node.opacity * pulse})`);
        nodeGradient.addColorStop(0.5, `rgba(139, 192, 246, ${node.opacity * pulse * 0.3})`);
        nodeGradient.addColorStop(1, "rgba(139, 192, 246, 0)");

        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections
      ctx.strokeStyle = "rgba(139, 192, 246, 0.12)";
      ctx.lineWidth = 0.5;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            const opacity = (1 - dist / 180) * 0.25;
            ctx.strokeStyle = `rgba(139, 192, 246, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Update and draw particles
      particles.forEach((particle) => {
        particle.y += particle.vy;
        particle.x += particle.vx;
        particle.life += 0.005;

        if (particle.life > particle.maxLife || particle.y < -50) {
          particle.x = Math.random() * w;
          particle.y = h + 50;
          particle.life = 0;
        }

        const [r, g, b] = particle.color;
        const alpha = Math.sin(particle.life * Math.PI) * 0.6;

        const particleGradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 3
        );
        particleGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        particleGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = particleGradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = "source-over";

      // Continue animation
      if (isAnimatingRef.current && theme === "amoled") {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    // Start animation
    isAnimatingRef.current = true;
    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(render);

    // Visibility API: pause/resume on tab switch
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isAnimatingRef.current = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      } else if (theme === "amoled" && !isAnimatingRef.current) {
        isAnimatingRef.current = true;
        lastFrameTimeRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isAnimatingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(resizeTimeout);
    };
  }, [theme, reducedMotion]);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {/* Light Mode Background */}
      {theme === "light" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-purple-500"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-transparent to-pink-500/30" />
        </motion.div>
      )}

      {/* Dark Mode Background (Purple Gradient) */}
      {theme === "dark" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ backgroundSize: "200% 200%" }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 30% 40%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)`,
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 70% 60%, rgba(236, 72, 153, 0.12) 0%, transparent 50%)`,
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
        </motion.div>
      )}

      {/* AMOLED Mode Background (Animated Aurora) */}
      {theme === "amoled" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ background: "#000000" }}
          />

          {/* Additional CSS-based glow layers for AMOLED */}
          {!reducedMotion && (
            <>
              <motion.div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(circle at 25% 35%, rgba(59, 130, 246, 0.1) 0%, transparent 45%)",
                }}
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(circle at 75% 65%, rgba(236, 72, 153, 0.08) 0%, transparent 45%)",
                }}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1.1, 1, 1.1],
                }}
                transition={{
                  duration: 11,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2,
                }}
              />
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

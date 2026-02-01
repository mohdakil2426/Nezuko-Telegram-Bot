import { useEffect, useRef, useCallback } from 'react';
import { useThemeConfig } from '@/lib/hooks/use-theme-config';
import { useTheme } from 'next-themes';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  opacity: number;
  color: string;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const { accentHex: accentColor, particleDensity, animations } = useThemeConfig();
  const { resolvedTheme } = useTheme();

  const initParticles = useCallback((width: number, height: number): Particle[] => {
    // Base particle count: adjust by density (0-100)
    const baseDensityFactor = 15000;
    const adjustedDensityFactor = baseDensityFactor / (particleDensity / 50);
    const particleCount = Math.min(Math.floor((width * height) / adjustedDensityFactor), Math.floor(80 * (particleDensity / 50)));
    const particles: Particle[] = [];
    
    // Generate monochromatic palette based on accent color
    const colors = resolvedTheme === 'dark' 
      ? [accentColor, '#ffffff', `${accentColor}80`, `${accentColor}40`]
      : [accentColor, '#000000', `${accentColor}80`, `${accentColor}40`];
    
    for (let i = 0; i < particleCount; i++) {
        // Random drift velocity
        const baseVx = (Math.random() - 0.5) * 0.5;
        const baseVy = (Math.random() - 0.5) * 0.5;
        
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    
    return particles;
  }, [resolvedTheme, accentColor, particleDensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = initParticles(canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      
      // Update and draw particles
      particles.forEach((particle, i) => {
        // Only animate motion if animations are enabled
        if (animations) {
          // Mouse attraction
          const dx = mouse.x - particle.x;
          const dy = mouse.y - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 200 && dist > 0) {
            const force = (200 - dist) / 200 * 0.02;
            particle.vx += (dx / dist) * force;
            particle.vy += (dy / dist) * force;
          }
          
          // Relax velocity back to natural drift
          particle.vx += (particle.baseVx - particle.vx) * 0.05;
          particle.vy += (particle.baseVy - particle.vy) * 0.05;
          
          // Apply velocity
          particle.x += particle.vx;
          particle.y += particle.vy;
          
          // Wrap around edges
          if (particle.x < 0) particle.x = canvas.width;
          if (particle.x > canvas.width) particle.x = 0;
          if (particle.y < 0) particle.y = canvas.height;
          if (particle.y > canvas.height) particle.y = 0;
        }
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        
        // Draw connections
        particles.slice(i + 1).forEach((other) => {
          const connDx = particle.x - other.x;
          const connDy = particle.y - other.y;
          const connDist = Math.sqrt(connDx * connDx + connDy * connDy);
          
          if (connDist < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            // Use accent color for connections (convert hex to rgba)
            const alpha = (resolvedTheme === 'dark' ? 0.15 : 0.1) * (1 - connDist / 120);
            ctx.strokeStyle = `${accentColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      
      // Draw mouse glow using accent color
      const gradient = ctx.createRadialGradient(
        mouse.x, mouse.y, 0,
        mouse.x, mouse.y, 300
      );
      const glowAlpha = resolvedTheme === 'dark' ? '14' : '0d'; // ~0.08 and ~0.05 in hex
      gradient.addColorStop(0, `${accentColor}${glowAlpha}`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initParticles, resolvedTheme, animations, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
}

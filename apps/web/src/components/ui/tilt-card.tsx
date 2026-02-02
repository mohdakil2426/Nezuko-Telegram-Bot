"use client";

import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useThemeConfig } from '@/lib/hooks/use-theme-config';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  intensity?: number;
  glowColor?: string;
  enableTilt?: boolean;
  enableGlow?: boolean;
}

export default function TiltCard({ 
  children, 
  className, 
  index = 0, 
  intensity = 15,
  glowColor,
  enableTilt = true,
  enableGlow = true
}: TiltCardProps) {
  const { accentHex: accentColor } = useThemeConfig();
  // Use provided glowColor or derive from accent color
  const effectiveGlowColor = glowColor || `${accentColor}25`;
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !enableTilt) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -intensity;
    const rotateY = ((x - centerX) / centerX) * intensity;
    
    setTransform({ rotateX, rotateY, scale: 1.02 });
    setGlowPosition({ 
      x: (x / rect.width) * 100, 
      y: (y / rect.height) * 100 
    });
  }, [enableTilt, intensity]);

  const handleMouseLeave = useCallback(() => {
    setTransform({ rotateX: 0, rotateY: 0, scale: 1 });
    setGlowPosition({ x: 50, y: 50 });
    setIsHovered(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-nezuko-border",
        "bg-gradient-to-br from-nezuko-surface to-nezuko-surface/80",
        "backdrop-blur-xl will-change-transform",
        className
      )}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        transform: enableTilt 
          ? `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg) scale(${transform.scale})`
          : undefined,
        transition: isHovered ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {/* Dynamic Glow Effect */}
      {enableGlow && (
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at ${glowPosition.x}% ${glowPosition.y}%, ${effectiveGlowColor}, transparent 40%)`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
      )}
      
      {/* Static Gradient Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%)',
        }}
      />
      
      {/* Border Glow on Hover */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500"
        style={{
          boxShadow: isHovered 
            ? `inset 0 1px 0 0 rgba(255,255,255,0.1), 0 0 30px -10px ${effectiveGlowColor}`
            : 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
          opacity: isHovered ? 1 : 0,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </motion.div>
  );
}

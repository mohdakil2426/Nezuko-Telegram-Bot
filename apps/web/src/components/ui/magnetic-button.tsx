import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useThemeConfig } from '@/lib/hooks/use-theme-config';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  magneticStrength?: number;
}

export function MagneticButton({
  children,
  className,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  magneticStrength = 0.3,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const { accentHex: accentColor } = useThemeConfig();

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || disabled) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    setPosition({
      x: distanceX * magneticStrength,
      y: distanceY * magneticStrength,
    });
  }, [disabled, magneticStrength]);

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const variants = {
    primary: 'bg-primary-gradient text-white hover:opacity-90 border-transparent',
    secondary: 'bg-[var(--nezuko-surface-hover)] text-[var(--text-primary)] border-[var(--nezuko-border)] hover:border-[var(--nezuko-border-hover)]',
    ghost: 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 border-transparent',
    outline: 'bg-transparent text-[var(--text-primary)] border-[var(--nezuko-border)] hover:border-primary hover:bg-primary/5',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <motion.button
      ref={buttonRef}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-all duration-300 overflow-hidden',
        'border disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      animate={{
        x: position.x,
        y: position.y,
        scale: isHovered ? 1.05 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 15,
        mass: 0.5,
      }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Ripple Effect */}
      {isHovered && (
        <motion.span
          className="absolute inset-0 bg-white/10"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}
      
      {/* Glow Effect */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        animate={{
          boxShadow: isHovered 
            ? `0 0 30px -5px ${accentColor}66`
            : `0 0 0px 0px ${accentColor}00`,
        }}
        transition={{ duration: 0.3 }}
      />
      
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

export default MagneticButton;

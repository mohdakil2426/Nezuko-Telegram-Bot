"use client";

import { Moon, Sun, Monitor, Palette, Sparkles, Check, Eye, EyeOff, Zap, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useThemeConfig, ACCENT_THEMES, type AccentId } from '@/lib/hooks/use-theme-config';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import TiltCard from '@/components/TiltCard';
import { FadeIn } from '@/components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// Theme Option Card
interface ThemeOptionProps {
  label: string;
  description: string;
  icon: React.ElementType;
  isSelected: boolean;
  onClick: () => void;
  preview: React.ReactNode;
  index: number;
}

function ThemeOption({ label, description, icon: Icon, isSelected, onClick, preview, index }: ThemeOptionProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-2xl border-2 transition-all duration-300 text-left group overflow-hidden",
        isSelected 
          ? "border-primary bg-primary/5" 
          : "border-(--nezuko-border) bg-(--nezuko-surface) hover:border-(--nezuko-border-hover) hover:bg-(--nezuko-surface-hover)"
      )}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <AnimatePresence>
        {isSelected && (
          <motion.div 
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: isSelected ? 'radial-gradient(circle at center, color-mix(in srgb, var(--color-primary) 15%, transparent), transparent 70%)' : 'none',
        }}
      />
      
      <div className="flex items-start gap-4 relative z-10">
        <motion.div 
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
            isSelected ? "bg-primary text-white" : "bg-(--nezuko-surface-hover) text-(--text-muted) group-hover:text-(--text-primary)"
          )}
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
        <div className="flex-1">
          <h4 className={cn("font-semibold transition-colors", isSelected ? "text-primary" : "text-(--text-primary)")}>
            {label}
          </h4>
          <p className="text-xs text-(--text-muted) mt-1">{description}</p>
        </div>
      </div>
      
      {/* Preview */}
      <div className="mt-4 h-20 rounded-xl overflow-hidden border border-(--nezuko-border)">
        {preview}
      </div>
    </motion.button>
  );
}

// Accent Color Option
interface AccentColorProps {
  id: string;
  color: string;
  gradient: string;
  name: string;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

function AccentColorOption({ color, gradient, name, isSelected, onClick, index }: AccentColorProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300 group hover:bg-(--nezuko-surface-hover) border border-transparent",
        isSelected && "bg-(--nezuko-surface) border-(--nezuko-border)"
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 400, damping: 15 }}
    >
      <motion.div 
        className={cn(
          "w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center border",
          isSelected ? "scale-105 border-(--text-primary)" : "border-transparent group-hover:scale-105"
        )}
        style={{ 
          background: gradient, 
          boxShadow: isSelected ? `0 0 15px ${color}` : 'none'
        }}
        animate={isSelected ? {
          boxShadow: [`0 0 10px ${color}`, `0 0 20px ${color}`, `0 0 10px ${color}`]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <span className={cn("text-[10px] font-medium transition-colors text-center w-full truncate px-1", isSelected ? "text-(--text-primary)" : "text-(--text-muted)")}>
        {name}
      </span>
    </motion.button>
  );
}

function CustomAccentOption({ isSelected, color }: { isSelected: boolean; color: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.button
          className={cn(
            "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300 group hover:bg-(--nezuko-surface-hover) border border-transparent",
            isSelected && "bg-(--nezuko-surface) border-(--nezuko-border)"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center border transition-all",
            isSelected ? "border-(--text-primary)" : "border-dashed border-(--text-muted) group-hover:border-(--text-primary)"
          )}
          style={{ background: isSelected ? color : 'transparent' }}
          >
            {isSelected ? (
               <Check className="w-4 h-4 text-white mix-blend-difference" />
            ) : (
               <Plus className="w-4 h-4 text-(--text-muted) group-hover:text-(--text-primary)" />
            )}
          </div>
          <span className={cn("text-[10px] font-medium transition-colors text-center w-full truncate px-1", isSelected ? "text-(--text-primary)" : "text-(--text-muted)")}>
            Custom
          </span>
        </motion.button>
      </DialogTrigger>
      <CustomColorDialogContent onClose={() => setIsOpen(false)} />
    </Dialog>
  );
}

function CustomColorDialogContent({ onClose }: { onClose: () => void }) {
  const { customColor, setCustomColor, setAccentId } = useThemeConfig();
  const [localColor, setLocalColor] = useState(customColor);

  const handleSave = () => {
    setCustomColor(localColor);
    setAccentId('custom');
    toast.success('Custom color applied!');
    onClose();
  };

  return (
      <DialogContent className="sm:max-w-md bg-(--nezuko-surface) border-(--nezuko-border) text-(--text-primary)">
        <DialogHeader>
          <DialogTitle>Custom Accent Color</DialogTitle>
          <DialogDescription>
            Choose a custom color for your dashboard. We'll automatically generate the gradients.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="flex items-center gap-4">
             <div 
               className="w-20 h-20 rounded-2xl border-2 border-(--nezuko-border) shadow-xl transition-colors"
               style={{ backgroundColor: localColor }}
             />
             <div className="flex-1 space-y-2">
               <Label htmlFor="color-hex">Hex Code</Label>
               <div className="flex gap-2">
                 <Input
                   id="color-hex"
                   value={localColor}
                   onChange={(e) => setLocalColor(e.target.value)}
                   className="font-mono uppercase bg-(--nezuko-bg) border-(--nezuko-border)"
                   placeholder="#000000"
                 />
                 <div className="relative w-12 h-10 overflow-hidden rounded-md border border-(--nezuko-border) cursor-pointer">
                   <input
                     type="color"
                     value={localColor}
                     onChange={(e) => setLocalColor(e.target.value)}
                     className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 border-0 cursor-pointer"
                   />
                 </div>
               </div>
             </div>
          </div>
          
          <div className="space-y-2">
            <Label>Gradient Preview</Label>
            <div 
              className="h-12 w-full rounded-xl"
              style={{ background: `linear-gradient(135deg, ${localColor} 0%, hsl(${ (parseInt("0x"+(localColor.length===7?localColor.slice(1,3):"00"))/255*360 + 40)%360 }, 80%, 60%) 100%)` }} 
            >
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-(--nezuko-border) hover:bg-(--nezuko-surface-hover) text-(--text-primary)">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Apply Color
          </Button>
        </DialogFooter>
      </DialogContent>
  )
}

// Setting Section
interface SettingSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
  delay?: number;
}

function SettingSection({ title, description, icon: Icon, children, delay = 0 }: SettingSectionProps) {
  return (
    <TiltCard className="p-6">
      <FadeIn delay={delay}>
        <div className="flex items-start gap-4 mb-6">
          <motion.div 
            className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
            <p className="text-sm text-(--text-muted)">{description}</p>
          </div>
        </div>
        {children}
      </FadeIn>
    </TiltCard>
  );
}

// Light Preview
function LightPreview() {
  return (
    <div className="w-full h-full bg-gray-100 p-3 flex flex-col gap-2">
      <div className="h-3 w-3/4 bg-gray-300 rounded" />
      <div className="h-2 w-1/2 bg-gray-200 rounded" />
      <div className="flex gap-2 mt-auto">
        <div className="h-6 w-12 bg-primary rounded" />
        <div className="h-6 w-12 bg-gray-300 rounded" />
      </div>
    </div>
  );
}

// Dark Preview
function DarkPreview() {
  return (
    <div className="w-full h-full bg-[#0f1014] p-3 flex flex-col gap-2">
      <div className="h-3 w-3/4 bg-gray-700 rounded" />
      <div className="h-2 w-1/2 bg-gray-800 rounded" />
      <div className="flex gap-2 mt-auto">
        <div className="h-6 w-12 bg-primary rounded" />
        <div className="h-6 w-12 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

// System Preview
function SystemPreview() {
  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 bg-linear-to-r from-gray-100 to-[#0f1014] p-3 flex flex-col gap-2">
        <div className="h-3 w-3/4 bg-linear-to-r from-gray-300 to-gray-700 rounded" />
        <div className="h-2 w-1/2 bg-linear-to-r from-gray-200 to-gray-800 rounded" />
        <div className="flex gap-2 mt-auto">
          <div className="h-6 w-12 bg-primary rounded" />
          <div className="h-6 w-12 bg-linear-to-r from-gray-300 to-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const { 
    accentHex: accentColor,
    accentGradient,
    accentId,
    setAccentId,
    customColor,
    animations,
    setAnimations,
    glassEffects,
    setGlassEffects,
    reducedMotion,
    setReducedMotion,
    particles,
    setParticles,
    particleDensity,
    setParticleDensity
  } = useThemeConfig();



  // Get current accent details for preview
  const currentAccent = ACCENT_THEMES[accentId];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
              Appearance <span className="gradient-text">Settings</span>
            </h1>
            <p className="text-(--text-muted)">Customize how Nezuko looks and feels.</p>
          </div>

        </div>
      </FadeIn>

      {/* Theme Selection */}
      <SettingSection
        title="Theme"
        description="Choose your preferred color scheme."
        icon={Palette}
        delay={0.1}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ThemeOption
            label="Light"
            description="Clean and bright"
            icon={Sun}
            isSelected={theme === 'light'}
            onClick={() => setTheme('light')}
            preview={<LightPreview />}
            index={0}
          />
          <ThemeOption
            label="Dark"
            description="Easy on the eyes"
            icon={Moon}
            isSelected={theme === 'dark'}
            onClick={() => setTheme('dark')}
            preview={<DarkPreview />}
            index={1}
          />
          <ThemeOption
            label="System"
            description="Follows your device"
            icon={Monitor}
            isSelected={theme === 'system'}
            onClick={() => setTheme('system')}
            preview={<SystemPreview />}
            index={2}
          />
        </div>
      </SettingSection>

      {/* Accent Color */}
      <SettingSection
        title="Accent Theme"
        description="Select a gradient theme for your dashboard."
        icon={Palette}
        delay={0.2}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Object.values(ACCENT_THEMES)
            .filter(t => t.id !== 'custom')
            .map(({ id, name, gradient, hex }, idx) => (
            <AccentColorOption
              key={id}
              id={id}
              color={hex}
              gradient={gradient}
              name={name}
              isSelected={accentId === id}
              onClick={() => setAccentId(id as AccentId)}
              index={idx}
            />
          ))}
          <CustomAccentOption 
            isSelected={accentId === 'custom'}
            color={customColor}
          />
        </div>
      </SettingSection>
      
      {/* Effects & Animations */}
      <SettingSection
        title="Effects & Animations"
        description="Control visual effects and motion."
        icon={Sparkles}
        delay={0.3}
      >
        <div className="space-y-5">
          {/* Animations */}
          <motion.div 
            className="flex items-center justify-between py-2"
            whileHover={{ x: 5 }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <motion.div 
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  animations ? "bg-primary/10 text-primary" : "bg-(--nezuko-surface-hover) text-(--text-muted)"
                )}
                animate={animations ? { rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Animations</p>
                <p className="text-xs text-(--text-muted)">Enable smooth transitions and micro-interactions</p>
              </div>
            </div>
            <Switch
              checked={animations}
              onCheckedChange={setAnimations}
              className="data-[state=checked]:bg-primary"
            />
          </motion.div>

          {/* Glass Effects */}
          <motion.div 
            className="flex items-center justify-between py-2 border-t border-(--nezuko-border)/50"
            whileHover={{ x: 5 }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <motion.div 
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  glassEffects ? "bg-primary/10 text-primary" : "bg-(--nezuko-surface-hover) text-(--text-muted)"
                )}
                whileHover={{ scale: 1.1 }}
              >
                <AnimatePresence mode="wait">
                  {glassEffects ? (
                    <motion.div
                      key="eye"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Eye className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="eyeoff"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <EyeOff className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Glass Effects</p>
                <p className="text-xs text-(--text-muted)">Enable frosted glass styling on cards</p>
              </div>
            </div>
            <Switch
              checked={glassEffects}
              onCheckedChange={setGlassEffects}
              className="data-[state=checked]:bg-primary"
            />
          </motion.div>

          {/* Reduced Motion */}
          <motion.div 
            className="flex items-center justify-between py-2 border-t border-(--nezuko-border)/50"
            whileHover={{ x: 5 }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <motion.div 
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  reducedMotion ? "bg-yellow-500/10 text-yellow-500" : "bg-(--nezuko-surface-hover) text-(--text-muted)"
                )}
                whileHover={{ scale: 1.1 }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </motion.div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Reduced Motion</p>
                <p className="text-xs text-(--text-muted)">Minimize animations for accessibility</p>
              </div>
            </div>
            <Switch
              checked={reducedMotion}
              onCheckedChange={setReducedMotion}
              className="data-[state=checked]:bg-yellow-500"
            />
          </motion.div>

          {/* Particles Toggle */}
          <motion.div 
            className="flex items-center justify-between py-2 border-t border-(--nezuko-border)/50"
            whileHover={{ x: 5 }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <motion.div 
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  particles ? "bg-primary/10 text-primary" : "bg-(--nezuko-surface-hover) text-(--text-muted)"
                )}
                animate={particles ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-5 h-5" />
              </motion.div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Particle Effects</p>
                <p className="text-xs text-(--text-muted)">Enable floating particle background</p>
              </div>
            </div>
            <Switch
              checked={particles}
              onCheckedChange={setParticles}
              className="data-[state=checked]:bg-primary"
            />
          </motion.div>

          {/* Particle Density Slider */}
          {particles && (
            <motion.div 
              className="py-4 border-t border-(--nezuko-border)/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Particle Density</p>
                    <p className="text-xs text-(--text-muted)">Adjust the amount of particles ({particleDensity}%)</p>
                  </div>
                </div>
              </div>
              <div className="px-12">
                <Slider
                  value={[particleDensity]}
                  onValueChange={(value) => setParticleDensity(value[0])}
                  min={10}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-(--text-muted) mt-2">
                  <span>Less</span>
                  <span>More</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </SettingSection>

      {/* Preview Card */}
      <TiltCard className="p-8 text-center" index={1} glowColor={`${accentColor}15`}>
        <FadeIn delay={0.4}>
          <motion.div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-primary-gradient"
            style={{ 
              background: accentGradient,
              boxShadow: `0 10px 30px ${accentColor}40`
            }}
            animate={{ 
              boxShadow: [`0 0 20px ${accentColor}30`, `0 0 40px ${accentColor}50`, `0 0 20px ${accentColor}30`]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Preview Your Changes
          </h3>
          <p className="text-sm text-(--text-muted) mb-6 max-w-md mx-auto">
            Your appearance settings will be applied immediately. Toggle between light and dark mode to see the difference.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: `${accentColor}15` }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs text-(--text-muted)">
                Current: {resolvedTheme === 'dark' ? 'Dark' : 'Light'} Mode
              </span>
            </motion.div>
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: `${accentColor}15` }}
              whileHover={{ scale: 1.05 }}
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: accentColor }}
              />
              <span className="text-xs text-(--text-muted)">
                Accent: {currentAccent?.name || 'Cyberpunk'}
              </span>
            </motion.div>
          </div>
        </FadeIn>
      </TiltCard>
    </div>
  );
}

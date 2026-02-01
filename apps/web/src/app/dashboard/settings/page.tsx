"use client";

import { useThemeConfig, ACCENT_THEMES, type AccentId } from '@/lib/hooks/use-theme-config';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Monitor, Sun, Moon, Zap, Layers, Image as ImageIcon, Check } from 'lucide-react';
import { MagneticButton } from '@/components/ui/magnetic-button';
import PageHeader from '@/components/layout/PageHeader';
import DashboardCard from '@/components/DashboardCard';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';



export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { 
    accentHex: accentColor, 
    accentId,
    setAccentId,
    animations,
    setAnimations,
    glassEffects,
    setGlassEffects,
    particles,
    setParticles,
    reducedMotion
  } = useThemeConfig();
  
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <PageHeader
        title="Settings"
        highlight="Preferences"
        description="Customize your dashboard appearance and behavior."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Navigation/Profile */}
        <div className="space-y-6">
           <DashboardCard title="Profile" className="p-6 text-center">
              <div className="relative inline-block">
                <div 
                  className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-xl"
                  style={{ backgroundColor: accentColor }}
                >
                  {user?.name.charAt(0)}
                </div>
                <div className="absolute bottom-4 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-(--nezuko-card)" />
              </div>
              <h3 className="text-xl font-bold text-(--text-primary)">{user?.name}</h3>
              <p className="text-sm text-(--text-muted) mb-6">{user?.email}</p>
              
              <div className="space-y-2">
                 <button className="w-full py-2 px-4 rounded-lg bg-(--nezuko-surface-hover) text-sm font-medium hover:bg-(--nezuko-border) transition-colors text-left flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Account Settings
                 </button>
                 <button className="w-full py-2 px-4 rounded-lg bg-primary/10 text-primary text-sm font-medium transition-colors text-left flex items-center gap-3 ring-1 ring-primary/20">
                    <Palette className="w-4 h-4" /> Appearance
                 </button>
                 <button className="w-full py-2 px-4 rounded-lg bg-(--nezuko-surface-hover) text-sm font-medium hover:bg-(--nezuko-border) transition-colors text-left flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Notifications
                 </button>
              </div>
           </DashboardCard>
        </div>

        {/* Right Column - Settings Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Theme Mode */}
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sun className="w-5 h-5 text-primary" /> Theme Mode
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300",
                    theme === option.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-(--nezuko-border) hover:border-(--text-muted) text-(--text-muted) hover:bg-(--nezuko-surface-hover)"
                  )}
                >
                  <option.icon className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Accent Color */}
          <section>
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" /> Accent Color
            </h2>
            <div className="glass p-6 rounded-2xl">
                 <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                   {Object.values(ACCENT_THEMES).map((themeConfig) => {
                     if (themeConfig.id === 'custom') return null; // Skip custom for now or handle separately
                     return (
                       <motion.button
                         key={themeConfig.id}
                         onClick={() => setAccentId(themeConfig.id as AccentId)}
                         whileHover={{ scale: 1.1 }}
                         whileTap={{ scale: 0.9 }}
                         className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform"
                         style={{ backgroundColor: themeConfig.hex }}
                         title={themeConfig.name}
                       >
                         {accentId === themeConfig.id && (
                           <Check className="text-white w-6 h-6 drop-shadow-md" />
                         )}
                       </motion.button>
                     );
                   })}
                 </div>
               <p className="mt-4 text-sm text-(--text-muted)">
                 This color will be key to your dashboard's personality, applied to buttons, charts, and highlights.
               </p>
            </div>
          </section>

          {/* User Interface */}
          <section>
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> Interface Effects
            </h2>
            <div className="space-y-4">
               {/* Animations */}
               <div className="glass p-4 rounded-xl flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-(--text-primary)">Enable Animations</h4>
                      <p className="text-xs text-(--text-muted)">Smooth transitions and effects</p>
                    </div>
                 </div>
                 <Switch 
                   checked={animations} 
                   onCheckedChange={setAnimations}
                 />
               </div>

               {/* Glassmorphism */}
               <div className="glass p-4 rounded-xl flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-(--text-primary)">Glassmorphism</h4>
                      <p className="text-xs text-(--text-muted)">Blur and transparency effects (High GPU)</p>
                    </div>
                 </div>
                 <Switch 
                   checked={glassEffects} 
                   onCheckedChange={setGlassEffects}
                 />
               </div>

                {/* Particles */}
               <div className="glass p-4 rounded-xl flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-(--text-primary)">Background Particles</h4>
                      <p className="text-xs text-(--text-muted)">Interactive background elements</p>
                    </div>
                 </div>
                 <Switch 
                   checked={particles} 
                   onCheckedChange={setParticles}
                 />
               </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

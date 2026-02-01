"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from 'next-themes';
import { useThemeConfig } from '@/lib/hooks/use-theme-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Mail, Lock, LogIn, Shield, Sun, Moon } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';

// Floating Orbs Component
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  const { accentHex: accentColor } = useThemeConfig();
  const [email, setEmail] = useState('operator@nezuko.io');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isHovering, setIsHovering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await login(email, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--nezuko-bg) bg-grid-pattern bg-size-[40px_40px] transition-colors duration-300 relative overflow-hidden">
      {/* Animated Background */}
      <ParticleBackground />
      <FloatingOrbs />
      
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-2xl glass text-(--text-muted) hover:text-(--text-primary) transition-all duration-300 hover:scale-110 z-20 group"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-5 h-5 transition-transform group-hover:rotate-180 duration-500" />
        ) : (
          <Moon className="w-5 h-5 transition-transform group-hover:rotate-12" />
        )}
      </button>

      <div className="w-full max-w-[1440px] flex flex-col lg:flex-row min-h-screen overflow-hidden relative z-10">
        {/* Left Side - Hero */}
        <div className="hidden lg:flex w-1/2 flex-col items-center justify-center relative p-12">
          <div className="flex flex-col items-center z-10">
            {/* Glowing Image Container */}
            <div 
              className="relative group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <div 
                className="absolute -inset-4 rounded-3xl blur-2xl transition-all duration-1000"
                style={{ 
                  background: `linear-gradient(135deg, ${accentColor}66, ${accentColor}33)`,
                  opacity: isHovering ? 1 : 0.5,
                  transform: isHovering ? 'scale(1.1)' : 'scale(1)'
                }}
              />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 w-[450px] h-[450px] transform transition-transform duration-700 group-hover:scale-105">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80"
                  alt="Abstract crystal"
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-linear-to-t from-(--nezuko-bg) to-transparent opacity-60 z-10" />
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
                <span className="text-white">The Silent</span>{' '}
                <span className="gradient-text">
                  Guardian
                </span>
              </h1>
              <p className="text-sm font-semibold tracking-[0.3em] text-white/50 uppercase">
                Enterprise Security System
              </p>
            </div>
          </div>
          
          <div className="absolute bottom-8 left-12 font-mono text-xs text-white/30 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            SYS.VER.4.0.2 // ONLINE
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div 
            className="relative w-full max-w-[440px] rounded-3xl p-8 md:p-10 shadow-2xl border border-white/10 backdrop-blur-xl"
            style={{ 
              background: 'linear-gradient(145deg, rgba(15, 15, 25, 0.9), rgba(10, 10, 15, 0.95))',
            }}
          >
            {/* Glow Effect */}
            <div className="absolute -inset-px rounded-3xl bg-primary/20 blur-sm opacity-50" />
            
            <div className="relative z-10">
              {/* Logo */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative group">
                  <div className="absolute inset-0 bg-primary rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                  <div className="relative w-full h-full bg-primary rounded-2xl flex items-center justify-center">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white mb-2">NEZUKO</h2>
                <p className="text-white/50">Welcome back, Operator.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-white/40 uppercase tracking-wider">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@nezuko.io"
                      className="pl-12 pr-4 py-3.5 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl text-white placeholder-white/20 h-12 transition-all focus:bg-white/10"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-white/40 uppercase tracking-wider">
                      Password
                    </Label>
                    <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-12 pr-12 py-3.5 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl text-white placeholder-white/20 h-12 transition-all focus:bg-white/10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="h-5 w-5 border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label className="ml-3 text-sm text-white/60 cursor-pointer">
                    Remember this device
                  </Label>
                </div>

                {error && (
                  <div className="text-sm text-red-400 text-center bg-red-500/10 py-2 rounded-lg">{error}</div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all duration-300 transform active:scale-[0.98] h-12 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-(--nezuko-bg) bg-grid-pattern bg-size-[40px_40px] opacity-90 group-hover:opacity-100 transition-opacity" />
                  {isLoading ? (
                    <div className="relative w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2 relative" />
                      <span className="relative">Access Dashboard</span>
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative mt-8 mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 text-white/40" style={{ background: 'rgba(15, 15, 25, 0.95)' }}>
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center py-3.5 px-4 bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl transition-all h-12"
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none">
                  <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                  <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.2401 24.0008Z" fill="#34A853" />
                  <path d="M5.50253 14.3003C5.00236 12.8199 5.00236 11.1799 5.50253 9.69951V6.60861H1.51649C-0.18551 10.0056 -0.18551 13.9945 1.51649 17.3915L5.50253 14.3003Z" fill="#FBBC05" />
                  <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.60861L5.50264 9.69951C6.45064 6.86154 9.10947 4.74966 12.2401 4.74966Z" fill="#EA4335" />
                </svg>
                Google
              </Button>

              {/* Footer */}
              <div className="mt-8 flex justify-center space-x-6 text-xs text-white/30">
                <button className="hover:text-white/60 transition-colors">Privacy Policy</button>
                <span>•</span>
                <button className="hover:text-white/60 transition-colors">Terms of Service</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

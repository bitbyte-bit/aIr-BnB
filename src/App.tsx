import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, Settings, LayoutDashboard, LogOut, Menu, X, Heart, PlusCircle, BarChart3, Briefcase, Download, Share, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import HomePage from './pages/Home';
import AuthPage from './pages/Auth';
import ProfilePage from './pages/Profile';
import AdminPage from './pages/Admin';
import BusinessPage from './pages/Business';
import { User as UserType, Business } from './types';
import socket from './socket';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<UserType | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      localStorage.removeItem('user');
      return null;
    }
  });
  const [business, setBusiness] = useState<Business | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone && !isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS or browsers where beforeinstallprompt doesn't fire but we want to show instructions
    if (!isStandalone && !isDismissed && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      // We can't programmatically trigger install on iOS, but we could show a different banner
      // For now, let's just show the banner if we can't detect beforeinstallprompt but know it's not standalone
      // Actually, without beforeinstallprompt we can't use the .prompt() method.
      // So on iOS we'd usually show "Add to Home Screen" instructions.
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If no deferredPrompt (e.g. iOS), we could show instructions
      alert('To install: tap the share button and "Add to Home Screen"');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  useEffect(() => {
    if (user) {
      fetchBusiness();
      setupNotifications();
    }
  }, [user]);

  const fetchBusiness = async (retries = 3) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/businesses/my/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setBusiness(data);
      }
    } catch (err) {
      if (retries > 0) {
        console.warn(`Retrying fetchBusiness... (${retries} left)`);
        setTimeout(() => fetchBusiness(retries - 1), 1000);
      } else {
        console.error("Failed to fetch business:", err);
      }
    }
  };

  const setupNotifications = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }

    socket.on('notification', (data) => {
      if (Notification.permission === "granted") {
        new Notification(data.title, { body: data.body });
      }
    });

    return () => {
      socket.off('notification');
    };
  };

  const handleLogin = (userData: UserType) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setBusiness(null);
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
        <AnimatePresence>
          {showInstallBanner && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-20 md:bottom-6 left-4 right-4 z-50 md:left-auto md:right-6 md:w-96"
            >
              <div className="bg-white border border-neutral-200 p-6 rounded-[2.5rem] shadow-2xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
                    <Download size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-neutral-900">Install Vitu</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed mt-1">
                      Experience Vitu like a native app on your device.
                    </p>
                  </div>
                  <button 
                    onClick={handleDismissBanner}
                    className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-emerald-50 p-3 rounded-2xl flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Check size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Offline</span>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-2xl flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Check size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Faster</span>
                  </div>
                </div>

                {/iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator as any).standalone ? (
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 space-y-3">
                    <p className="text-xs font-medium text-neutral-600">To install on iOS:</p>
                    <ol className="text-xs text-neutral-500 space-y-2 list-decimal list-inside">
                      <li>Tap the <Share size={14} className="inline mx-1 text-blue-500" /> button in Safari</li>
                      <li>Select <span className="font-bold text-neutral-900">"Add to Home Screen"</span></li>
                      <li>Tap <span className="font-bold text-neutral-900">"Add"</span> to finish</li>
                    </ol>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleDismissBanner}
                      className="flex-1 py-4 text-sm font-bold text-neutral-500 hover:bg-neutral-100 rounded-2xl transition-colors"
                    >
                      Maybe Later
                    </button>
                    <button
                      onClick={handleInstallClick}
                      className="flex-[2] py-4 bg-neutral-900 text-white font-bold rounded-2xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-neutral-200"
                    >
                      <Download size={20} />
                      Install Now
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <Routes>
            {!user ? (
              <Route path="*" element={<AuthPage onLogin={handleLogin} />} />
            ) : (
              <Route
                path="*"
                element={
                  <Layout user={user} business={business} onLogout={handleLogout}>
                    <Routes>
                      <Route path="/" element={<HomePage user={user} />} />
                      <Route path="/item/:itemId" element={<HomePage user={user} />} />
                      <Route path="/profile" element={<ProfilePage user={user} onUpdate={handleLogin} />} />
                      <Route path="/profile/:userId" element={<ProfilePage user={user} onUpdate={handleLogin} />} />
                      <Route path="/business" element={<BusinessPage user={user} business={business} onUpdate={fetchBusiness} />} />
                      {user.role === 'admin' && <Route path="/admin" element={<AdminPage />} />}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                }
              />
            )}
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  );
}

function Layout({ children, user, business, onLogout }: { children: React.ReactNode; user: UserType; business: Business | null; onLogout: () => void }) {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Business', icon: Briefcase, path: '/business' },
    { label: 'Profile', icon: User, path: '/profile' },
    ...(user.role === 'admin' ? [{ label: 'Admin', icon: LayoutDashboard, path: '/admin' }] : []),
  ];

  const isHome = location.pathname === '/' || location.pathname.startsWith('/item/');

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-50">
      {/* Top Bar (Native Style) */}
      <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-white/80 backdrop-blur-xl border-b border-neutral-100 safe-top">
        <div className="flex items-center gap-3">
          {!isHome ? (
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 text-neutral-600 active:scale-90 transition-transform"
            >
              <X size={20} className="rotate-45" /> {/* Back-like icon */}
            </button>
          ) : (
            <button onClick={() => setIsSideMenuOpen(true)} className="p-2 -ml-2 text-neutral-600 md:hidden active:scale-90 transition-transform">
              <Menu size={22} />
            </button>
          )}
          <span className="text-lg font-bold tracking-tight text-emerald-600">Vitu</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200">
            {user.profile_picture ? (
              <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400 font-bold text-xs">
                {user.name[0]}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Side Menu (Desktop & Mobile Overlay) */}
      <AnimatePresence>
        {isSideMenuOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSideMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
            />
            {/* Sidebar */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[60] w-72 bg-white flex flex-col shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-neutral-100">
                <span className="text-2xl font-bold tracking-tighter text-emerald-600">Vitu</span>
                <button onClick={() => setIsSideMenuOpen(false)} className="p-2 -mr-2 text-neutral-400">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex items-center gap-4 border-b border-neutral-50">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xl">
                  {user.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">{user.name}</h4>
                  <p className="text-xs text-neutral-500">{user.email}</p>
                </div>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSideMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 active:scale-95",
                      location.pathname === item.path
                        ? "bg-emerald-50 text-emerald-600 font-bold"
                        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                    )}
                  >
                    <item.icon size={20} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="p-6 border-t border-neutral-100 space-y-3">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 w-full px-4 py-3.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors active:scale-95"
                >
                  <LogOut size={20} />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 flex-col">
        <div className="flex items-center h-16 px-6 border-b border-neutral-100">
          <span className="text-2xl font-bold tracking-tighter text-emerald-600">Vitu</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                location.pathname === item.path
                  ? "bg-emerald-50 text-emerald-600 font-bold"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <item.icon size={20} />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content (Native Scroll) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative md:pl-0">
        <div className="max-w-4xl mx-auto w-full min-h-full pb-24 md:pb-8 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation (Native Style) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 h-[calc(4rem+env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-xl border-t border-neutral-100 flex items-center justify-around px-4 pb-[env(safe-area-inset-bottom)] md:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-16 h-12 transition-all active:scale-90",
                isActive ? "text-emerald-600" : "text-neutral-400"
              )}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-widest mt-1 transition-all",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-indicator"
                  className="absolute -top-3 w-1 h-1 bg-emerald-600 rounded-full"
                />
              )}
            </Link>
          );
        })}
        
        {/* Floating Action Button (Native style) */}
        <button 
          onClick={() => navigate('/business')}
          className="flex items-center justify-center w-12 h-12 bg-neutral-900 text-white rounded-2xl shadow-lg shadow-neutral-200 active:scale-90 transition-transform -mt-8 border-4 border-white"
        >
          <PlusCircle size={24} />
        </button>
      </nav>
    </div>
  );
}

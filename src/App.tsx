import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, User, Settings, LayoutDashboard, LogOut, Menu, X, Heart, PlusCircle, BarChart3, Briefcase, Download, Share, Check, Bell, MessageSquare, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import HomePage from './pages/Home';
import AuthPage from './pages/Auth';
import VerifyEmailPage from './pages/VerifyEmail';
import ResetPasswordPage from './pages/ResetPassword';
import ProfilePage from './pages/Profile';
import AdminPage from './pages/Admin';
import BusinessPage from './pages/Business';
import InboxPage from './pages/Inbox';
import PrivacyPage from './pages/Privacy';
import TermsPage from './pages/Terms';
import { ToastProvider } from './components/Toast';
import { User as UserType, Business } from './types';
import socket from './socket';
import { playNotificationAlert } from './utils/notificationSound';

// VAPID public key - should match server.js
const VAPID_PUBLIC_KEY = 'BJ3bPi4mRiJb9Ny8aYRP-5AhLrT-Smmmc-Y2vYw-iIyv6EVKsWlBFnQLrGQqmJXhGbhcnNumcWdjjG6Bni1CRco';

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
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('unread_notifications');
      const parsed = saved ? parseInt(saved, 10) : 0;
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    } catch {
      return 0;
    }
  });

  // Load unread count from localStorage on mount
  useEffect(() => {
    const savedCount = localStorage.getItem('unread_notifications');
    if (savedCount) {
      const count = parseInt(savedCount, 10);
      if (!isNaN(count)) {
        setUnreadCount(count);
      }
    }
  }, []);

  // Update badge when unread count changes
  useEffect(() => {
    // Skip if unreadCount is not a valid number
    if (typeof unreadCount !== 'number' || unreadCount < 0) {
      return;
    }
    
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount).catch(console.error);
      } else {
        navigator.clearAppBadge().catch(console.error);
      }
    }
    localStorage.setItem('unread_notifications', unreadCount.toString());
  }, [unreadCount]);

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
    if (user && user.id) {
      // Join user's notification room
      socket.emit('join', user.id);
      
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
      // Validate notification data before using
      const title = data?.title || 'Vitu Notification';
      const body = data?.body || data?.text || 'You have a new notification';
      
      // Play vibration and beep sound when notification is received (app is open)
      playNotificationAlert();
      
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      }
      // Increment unread count and update badge
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.off('notification');
    };
  };

  // Register Service Worker and subscribe to push notifications
  const registerPushNotifications = async (userId: number) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Check current permission
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // Save subscription to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, subscription })
        });

        console.log('Push subscription successful');
      }
    } catch (err) {
      console.error('Failed to register push notifications:', err);
    }
  };

  // Utility function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const handleLogin = (userData: UserType) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    // Join user to their notification room
    socket.emit('join', userData.id);
    // Register for push notifications after login
    registerPushNotifications(userData.id);
  };

  const handleLogout = () => {
    setUser(null);
    setBusiness(null);
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <ToastProvider>
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
            <Route path="/auth" element={!user ? <AuthPage onLogin={handleLogin} /> : <Navigate to="/" replace />} />
            <Route path="/verify-email" element={!user ? <VerifyEmailPage /> : <Navigate to="/" replace />} />
            <Route path="/reset-password" element={!user ? <ResetPasswordPage /> : <Navigate to="/" replace />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route
              path="/"
              element={<HomePage user={user} />}
            />
            <Route
              path="/item/:itemId"
              element={<HomePage user={user} />}
            />
            <Route
              path="/profile"
              element={user ? <ProfilePage user={user} onUpdate={handleLogin} /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/profile/:userId"
              element={user ? <ProfilePage user={user} onUpdate={handleLogin} /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/business"
              element={user ? <BusinessPage user={user} business={business} onUpdate={fetchBusiness} /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/inbox"
              element={user ? <InboxPage user={user} /> : <Navigate to="/auth" replace />}
            />
            {user?.role === 'admin' && <Route path="/admin" element={<AdminPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
      </ToastProvider>
    </Router>
  );
}

function Layout({ children, user, business, onLogout, unreadCount, setUnreadCount }: { children: React.ReactNode; user: UserType; business: Business | null; onLogout: () => void; unreadCount: number; setUnreadCount: (count: number) => void }) {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Profile', icon: User, path: '/profile' },
    { label: 'Inbox', icon: MessageSquare, path: '/inbox' },
    { label: business ? 'My Business' : 'Register Business', icon: Briefcase, path: '/business' },
    ...(user.role === 'admin' ? [{ label: 'Admin', icon: LayoutDashboard, path: '/admin' }] : []),
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navigation Bar - Always Visible */}
      <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSideMenuOpen(true)} className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors">
            <Menu size={22} />
          </button>
          <Link to="/" className="text-xl font-bold tracking-tight text-emerald-600">
            Vitu
          </Link>
        </div>
        
        {/* Search Button */}
        <Link 
          to="/" 
          className="flex items-center gap-2 px-3 py-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <Search size={18} />
          <span className="text-sm hidden sm:inline">Search</span>
        </Link>
        
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Link to="/" onClick={() => setUnreadCount(0)} className="relative p-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors">
              <Bell size={22} />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </Link>
          )}
          <Link to="/profile" className="w-9 h-9 rounded-full bg-neutral-200 overflow-hidden border border-neutral-300 hover:border-emerald-500 transition-colors">
            {user.profile_picture ? (
              <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold text-sm">
                {user.name[0]}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Side Menu (Slide-out Drawer) */}
      <AnimatePresence>
        {isSideMenuOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSideMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            />
            {/* Sidebar Drawer */}
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-neutral-200 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between h-14 px-6 border-b border-neutral-100">
                <span className="text-2xl font-bold tracking-tighter text-emerald-600">Vitu</span>
                <button onClick={() => setIsSideMenuOpen(false)} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* User Info */}
              <div className="p-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden border-2 border-emerald-500">
                    {user.profile_picture ? (
                      <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold text-lg">
                        {user.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 truncate">{user.name}</p>
                    <p className="text-sm text-neutral-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSideMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      location.pathname === item.path
                        ? "bg-emerald-50 text-emerald-600 font-medium"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t border-neutral-100 space-y-2">
                <Link
                  to="/privacy"
                  onClick={() => setIsSideMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors"
                >
                  <Settings size={20} />
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  onClick={() => setIsSideMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors"
                >
                  <Check size={20} />
                  Terms of Service
                </Link>
                <button
                  onClick={() => { setIsSideMenuOpen(false); onLogout(); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 pb-20 md:pb-24">
        {children}
      </main>

      {/* Bottom Navigation Bar - All Devices */}
      <nav className="fixed bottom-0 inset-x-0 z-50 h-16 bg-white/95 backdrop-blur-lg border-t border-neutral-200 flex items-center justify-around shadow-lg">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200",
              location.pathname === item.path 
                ? "text-emerald-600 bg-emerald-50" 
                : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-colors",
              location.pathname === item.path ? "bg-emerald-100" : ""
            )}>
              <item.icon size={22} />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider mt-0.5">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

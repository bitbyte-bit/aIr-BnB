import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, User, Settings, LayoutDashboard, LogOut, Menu, X, Heart, PlusCircle, BarChart3, Briefcase } from 'lucide-react';
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
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    if (user) {
      fetchBusiness();
      setupNotifications();
    }
  }, [user]);

  const fetchBusiness = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/businesses/my/${user.id}`);
      const data = await res.json();
      setBusiness(data);
    } catch (err) {
      console.error(err);
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
                      <Route path="/profile" element={<ProfilePage user={user} onUpdate={handleLogin} />} />
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

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Profile', icon: User, path: '/profile' },
    { label: business ? 'My Business' : 'Register Business', icon: Briefcase, path: '/business' },
    ...(user.role === 'admin' ? [{ label: 'Admin', icon: LayoutDashboard, path: '/admin' }] : []),
  ];

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0 md:pl-64">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white/80 backdrop-blur-md border-b border-neutral-200 md:hidden">
        <button onClick={() => setIsSideMenuOpen(true)} className="p-2 -ml-2 text-neutral-600">
          <Menu size={24} />
        </button>
        <span className="text-xl font-bold tracking-tight text-emerald-600">Vitu</span>
        <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden border border-neutral-300">
          {user.profile_picture ? (
            <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold">
              {user.name[0]}
            </div>
          )}
        </div>
      </header>

      {/* Side Menu (Desktop & Mobile Overlay) */}
      <AnimatePresence>
        {(isSideMenuOpen || window.innerWidth >= 768) && (
          <>
            {/* Mobile Overlay */}
            {isSideMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSideMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              />
            )}
            {/* Sidebar */}
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 flex flex-col transition-transform md:translate-x-0",
                !isSideMenuOpen && "hidden md:flex"
              )}
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-neutral-100">
                <span className="text-2xl font-bold tracking-tighter text-emerald-600">Vitu</span>
                <button onClick={() => setIsSideMenuOpen(false)} className="p-2 -mr-2 text-neutral-400 md:hidden">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSideMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      location.pathname === item.path
                        ? "bg-emerald-50 text-emerald-600 font-medium"
                        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t border-neutral-100">
                <button
                  onClick={onLogout}
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
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="fixed bottom-0 inset-x-0 z-30 h-16 bg-white/90 backdrop-blur-lg border-t border-neutral-200 flex items-center justify-around md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname === item.path ? "text-emerald-600" : "text-neutral-400"
            )}
          >
            <item.icon size={22} />
            <span className="text-[10px] font-medium uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

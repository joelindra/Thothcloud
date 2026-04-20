import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import FileExplorer from './components/FileExplorer';
import UploadManager from './components/UploadManager';
import DashboardStats from './components/DashboardStats';
import SecuritySettings from './components/SecuritySettings';
import SystemSettings from './components/SystemSettings';
import StorageUsage from './components/StorageUsage';
import api from './api';
import { LogOut, User, LayoutDashboard, ChevronRight, Home, Share2, Activity, Shield, Search, X, Settings as SettingsIcon, Skull, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [user, setUser] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Home' }]);
  const [currentView, setCurrentView] = useState('home'); // home, shared, recent, security, search
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-collapse sidebar on smaller desktops
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280 && window.innerWidth >= 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      api.get('/auth/me').then(res => setUser(res.data)).catch(() => setIsLoggedIn(false));
    }
  }, [isLoggedIn]);

  // Global Theme Sync
  useEffect(() => {
    const applyTheme = async () => {
      try {
        const res = await api.get('/settings/public');
        const { ui_theme, ui_animations } = res.data;

        // Theme class
        const themeClass = ui_theme === 'Deep-Blue' ? 'theme-deep-blue' :
          ui_theme === 'Stellar-White' ? 'theme-light' : '';

        document.documentElement.className = themeClass;

        // 💾 Persist to localStorage so next page load applies theme instantly (no flash)
        try { localStorage.setItem('thoth_theme', themeClass); } catch(e) {}

        // Animations class
        if (ui_animations === 'false') {
          document.documentElement.classList.add('animations-off');
        } else {
          document.documentElement.classList.remove('animations-off');
        }
      } catch (e) {
        console.error("Theme sync failed", e);
      }
    };
    applyTheme();

    // Refresh theme whenever view changes (in case settings were updated)
    const interval = setInterval(applyTheme, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const res = await api.get('/files/search', { params: { q: searchQuery } });
      setSearchResults(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleFolderChange = (id, name = 'Home') => {
    setSearchQuery('');
    setCurrentView('home');
    setCurrentFolderId(id);
    setIsMobileMenuOpen(false); // Close on nav

    if (id === null) {
      setBreadcrumbs([{ id: null, name: 'Home' }]);
    } else {
      const index = breadcrumbs.findIndex(b => b.id === id);
      if (index !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      } else {
        setBreadcrumbs(prev => [...prev, { id, name }]);
      }
    }
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const SidebarContent = ({ isMobile = false }) => (
    <div className={`flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarCollapsed && !isMobile ? 'px-3 py-8 items-center' : 'p-8'} space-y-12`}>
      <div className={`flex items-center w-full ${isSidebarCollapsed && !isMobile ? 'flex-col gap-6' : 'justify-between'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed && !isMobile ? 'justify-center w-full' : ''}`}>
          <div className="shrink-0 w-10 h-10 bg-gradient-to-br from-thoth-primary to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-thoth-primary/20">
            <LayoutDashboard size={22} className="text-white" />
          </div>
          <AnimatePresence>
            {(!isSidebarCollapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap overflow-hidden"
              >
                <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Thoth<span className="text-thoth-primary">Cloud</span></h1>
                <p className="text-[9px] font-bold text-thoth-text-dim uppercase tracking-[0.3em] mt-1">Terminal Node v1.4</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Eternal Flame Toggle Button (Desktop only) */}
        {!isMobile && (
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`relative w-12 h-12 flex items-center justify-center transition-all duration-700 group overflow-visible ${
              isSidebarCollapsed 
              ? 'text-thoth-text-dim/40 scale-90' 
              : 'text-orange-500 scale-100'
            }`}
          >
            <div className="relative flex items-center justify-center w-full h-full">
              <AnimatePresence>
                {!isSidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    {/* External Aura Glow */}
                    <motion.div
                      animate={{ 
                        scale: [1, 1.8, 1.2, 2, 1],
                        rotate: [0, 90, 180, 270, 360],
                        opacity: [0.2, 0.4, 0.2]
                      }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      className="absolute w-12 h-12 bg-orange-500/20 rounded-full blur-xl"
                    />
                    
                    {/* Dynamic Soul Fire */}
                    <motion.div
                      animate={{ 
                        scale: [1, 1.3, 1],
                        y: [0, -6, 0],
                        rotate: [-5, 5, -5]
                      }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="absolute"
                    >
                      <Flame size={28} className="text-orange-600 fill-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.9)]" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Minimized Static Flame */}
              {isSidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.2, color: 'var(--thoth-primary)' }}
                >
                  <Flame size={20} className="transition-colors" />
                </motion.div>
              )}
            </div>
          </button>
        )}
      </div>

      <div className={`space-y-8 flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden w-full ${isSidebarCollapsed && !isMobile ? 'flex flex-col items-center' : ''}`}>
        <div className="space-y-2 w-full">
          <AnimatePresence>
            {(!isSidebarCollapsed || isMobile) && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-black text-thoth-text-dim uppercase tracking-widest ml-3 mb-4 whitespace-nowrap opacity-60"
              >
                FileSystem
              </motion.p>
            )}
          </AnimatePresence>
          <nav className="space-y-2 w-full">
            {[
              { id: 'home', label: 'My Storage', icon: Home, active: currentView === 'home' && !searchQuery, action: () => { handleFolderChange(null); setCurrentView('home'); setIsMobileMenuOpen(false); } },
              { id: 'shared', label: 'Public Links', icon: Share2, active: currentView === 'shared', action: () => { setCurrentView('shared'); setSearchQuery(''); setIsMobileMenuOpen(false); } },
              { id: 'recent', label: 'Recent Files', icon: Activity, active: currentView === 'recent', action: () => { setCurrentView('recent'); setSearchQuery(''); setIsMobileMenuOpen(false); } },
            ].map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                title={isSidebarCollapsed ? item.label : ''}
                className={`w-full p-4 rounded-2xl transition-all duration-300 flex items-center group relative ${
                  isSidebarCollapsed && !isMobile ? 'justify-center' : 'justify-between'
                } ${
                  item.active 
                  ? 'bg-thoth-primary/10 text-thoth-primary border border-thoth-primary/10 shadow-sm' 
                  : 'hover:bg-thoth-primary/5 text-thoth-text-dim hover:text-thoth-text border border-transparent'
                }`}
              >
                <div className={`flex items-center gap-3 ${isSidebarCollapsed && !isMobile ? 'justify-center' : ''}`}>
                  <item.icon size={20} className={item.active ? 'text-thoth-primary' : 'group-hover:text-thoth-primary transition-colors'} />
                  <AnimatePresence>
                    {(!isSidebarCollapsed || isMobile) && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: -10 }}
                        className="text-sm font-bold tracking-tight whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {item.active && !isSidebarCollapsed && <motion.div layoutId="activeDot" className="w-1.5 h-1.5 rounded-full bg-thoth-primary shadow-[0_0_10px_var(--thoth-primary)]" />}
              </button>
            ))}
          </nav>
        </div>

        <section className="w-full">
          <AnimatePresence>
            {(!isSidebarCollapsed || isMobile) && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-black text-thoth-text-dim uppercase tracking-widest ml-3 mb-4 whitespace-nowrap opacity-60"
              >
                Settings
              </motion.p>
            )}
          </AnimatePresence>
          <nav className="space-y-2 w-full">
            {[
              { id: 'security', label: 'Security', icon: Shield, action: () => { setCurrentView('security'); setIsMobileMenuOpen(false); setSearchQuery(''); } },
              { id: 'settings', label: 'Systems', icon: SettingsIcon, action: () => { setCurrentView('settings'); setIsMobileMenuOpen(false); setSearchQuery(''); } },
            ].map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                title={isSidebarCollapsed ? item.label : ''}
                className={`w-full p-4 rounded-2xl transition-all flex items-center group ${
                  isSidebarCollapsed && !isMobile ? 'justify-center' : 'gap-3'
                } ${
                  currentView === item.id 
                  ? 'bg-thoth-primary/10 text-thoth-primary border border-thoth-primary/10 shadow-sm' 
                  : 'hover:bg-thoth-primary/5 text-thoth-text-dim hover:text-thoth-text border border-transparent'
                }`}
              >
                <item.icon size={20} className={currentView === item.id ? 'text-thoth-primary' : 'group-hover:text-thoth-primary transition-colors'} />
                <AnimatePresence>
                  {(!isSidebarCollapsed || isMobile) && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-bold tracking-tight whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </nav>
        </section>

        {!isSidebarCollapsed && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="pt-4">
            <StorageUsage />
          </motion.div>
        )}
      </div>

      <div className={`pt-8 border-t border-thoth-border ${isSidebarCollapsed && !isMobile ? 'space-y-0' : 'space-y-4'}`}>
        <div className={`flex items-center gap-4 ${isSidebarCollapsed && !isMobile ? 'justify-center p-0' : 'px-2'}`}>
          <div className="relative shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-thoth-primary/20 to-blue-600/20 border border-thoth-primary/20 rounded-xl flex items-center justify-center font-black text-thoth-primary text-lg">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-thoth-bg rounded-full" />
          </div>
          {(!isSidebarCollapsed || isMobile) && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 min-w-0">
              <p className="text-sm font-black truncate text-thoth-text">{user?.username}</p>
              <p className="text-[9px] text-thoth-text-dim font-bold uppercase tracking-widest">{user?.role} ACCOUNT</p>
            </motion.div>
          )}
          {(!isSidebarCollapsed || isMobile) && (
            <button
              onClick={handleLogout}
              className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/10 hover:border-red-500/30 group"
              title="Terminate Uplink"
            >
              <LogOut size={16} className="group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const MobileNavBar = () => (
    <div className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-thoth-bg/80 backdrop-blur-2xl border-t border-thoth-border px-6 flex items-center justify-between z-[80]">
        {[
            { id: 'home', icon: Home, action: () => { handleFolderChange(null); setCurrentView('home'); } },
            { id: 'recent', icon: Activity, action: () => { setCurrentView('recent'); setSearchQuery(''); } },
            { id: 'security', icon: Shield, action: () => { setCurrentView('security'); setSearchQuery(''); } },
            { id: 'settings', icon: SettingsIcon, action: () => { setCurrentView('settings'); setSearchQuery(''); } },
        ].map((item) => (
            <button
                key={item.id}
                onClick={item.action}
                className={`p-2 rounded-xl transition-all ${currentView === item.id ? 'text-thoth-primary' : 'text-thoth-text-dim'}`}
            >
                <item.icon size={20} />
            </button>
        ))}
    </div>
  );

  return (
    <div className="flex h-screen bg-thoth-bg text-thoth-text selection:bg-thoth-primary/30 overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.div 
        animate={{ width: isSidebarCollapsed ? 96 : 320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="border-r border-thoth-border glass hidden lg:block relative z-30 overflow-hidden shrink-0"
      >
        <SidebarContent />
      </motion.div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-thoth-bg/85 backdrop-blur-md z-[90] lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-thoth-bg border-r border-thoth-border z-[100] lg:hidden"
            >
              <SidebarContent isMobile={true} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] bg-thoth-primary/5 rounded-full blur-[160px] pointer-events-none" />

        <header className="h-24 border-b border-thoth-border flex items-center px-4 lg:px-10 justify-between bg-thoth-bg/40 backdrop-blur-2xl z-20 sticky top-0">
          <div className="flex items-center gap-6 flex-1">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-3 bg-thoth-text/5 hover:bg-thoth-text/10 rounded-2xl text-thoth-text-dim border border-thoth-border transition-all"
            >
              <LayoutDashboard size={20} />
            </button>

            <div className="hidden lg:flex flex-col">
              <p className="text-[8px] font-black text-thoth-primary uppercase tracking-[0.5em] mb-1">LOCATION</p>
              <h1 className="text-xl font-black italic tracking-tighter uppercase text-thoth-text opacity-40">STORAGE</h1>
            </div>

            {/* Global Search Bar */}
            <div className="max-w-2xl w-full mx-8 hidden sm:block">
              <div className="relative group">
                <div className="absolute inset-0 bg-thoth-primary/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-thoth-text-dim group-focus-within:text-thoth-primary transition-colors z-10" />
                <input
                  type="text"
                  placeholder="Search files, photos, or documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-thoth-card/40 border border-thoth-border rounded-2xl py-3.5 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-thoth-primary/30 transition-all font-medium placeholder:text-thoth-text-dim/50 text-sm glass relative z-10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 bg-thoth-text/[0.02] px-5 py-2.5 rounded-2xl border border-thoth-border">
              <div className="relative">
                <div className="w-2 h-2 bg-thoth-primary rounded-full animate-ping absolute" />
                <div className="w-2 h-2 bg-thoth-primary rounded-full" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-thoth-text-dim uppercase tracking-widest leading-none">Server Status</span>
                <span className="text-[10px] font-mono font-bold text-thoth-primary uppercase mt-1">Online</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 lg:p-10 custom-scrollbar relative z-10">
          <div className="max-w-6xl mx-auto space-y-8 lg:space-y-12 pb-20">
            {searchQuery.length > 2 ? (
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <Search size={24} className="text-thoth-primary" />
                  Search Results for "{searchQuery}"
                </h2>
                <FileExplorer
                  key={`search-${searchQuery}`}
                  searchData={searchResults}
                  mode="search"
                  onFolderChange={handleFolderChange}
                />
              </div>
            ) : currentView === 'security' ? (
              <SecuritySettings user={user} />
            ) : currentView === 'settings' ? (
              <SystemSettings />
            ) : (
              <>
                {currentView === 'home' && (
                  <UploadManager
                    currentFolderId={currentFolderId}
                    onUploadComplete={handleRefresh}
                  />
                )}

                <FileExplorer
                  key={`${currentView}-${refreshTrigger}`}
                  folderId={currentView === 'home' ? currentFolderId : null}
                  folderName={breadcrumbs[breadcrumbs.length - 1]?.name}
                  mode={currentView === 'home' ? 'all' : currentView}
                  onFolderChange={handleFolderChange}
                />
              </>
            )}
          </div>
        </div>
        <MobileNavBar />
      </main>
    </div>
  );
}

export default App;


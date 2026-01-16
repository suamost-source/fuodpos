
import React, { useState, useEffect } from 'react';
import { LayoutGrid, ShoppingCart, Receipt, Archive, Menu, Wifi, WifiOff, Settings, LogOut, User as UserIcon, Store, Users as UsersIcon, Cloud, RefreshCw, CheckCircle, AlertTriangle, Server, Globe, Package, Tablet, ChefHat } from 'lucide-react';
import { ViewState, ShopSettings, User } from '../types';
import { performDatabaseSync } from '../services/syncService';
import { getLastSyncTimestamp } from '../services/storageService';
import { getTranslation } from '../utils/translations';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  settings: ShopSettings;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isMobileOpen, setIsMobileOpen, settings, currentUser, onLogout }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<number>(getLastSyncTimestamp());

  const { themeColor, inputDensity, textColor, backgroundColor } = settings.appearance;
  const t = (key: any) => getTranslation(settings.language, key);

  const isDark = backgroundColor?.includes('900') || backgroundColor?.includes('800');
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
  const itemHover = isDark ? `hover:bg-gray-800 hover:text-${themeColor}-400` : `hover:bg-gray-100 hover:text-${themeColor}-600`;
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const handleSyncEvent = () => setSyncState('syncing');
    const handleSyncComplete = () => {
        setSyncState('synced');
        setLastSync(getLastSyncTimestamp());
        setTimeout(() => setSyncState('idle'), 3000);
    };

    window.addEventListener('sync-start', handleSyncEvent);
    window.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-start', handleSyncEvent);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, []);
  
  const handleManualSync = async () => {
      if (!settings.databaseSync?.enabled) return;
      setSyncState('syncing');
      const result = await performDatabaseSync();
      setSyncState(result.success ? 'synced' : 'error');
      if (result.success) setLastSync(Date.now());
      setTimeout(() => setSyncState('idle'), 3000);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => { setView(view); setIsMobileOpen(false); }}
      className={`flex items-center w-full ${inputDensity === 'compact' ? 'px-4 py-3' : 'px-6 py-4'} text-left transition-colors duration-200 
        ${currentView === view ? `bg-${themeColor}-600 text-white shadow-lg` : `${mutedText} ${itemHover}`}`}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsMobileOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 ${isDark ? 'bg-gray-900' : 'bg-white'} border-r ${borderColor} transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:flex md:flex-col ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex items-center justify-center ${inputDensity === 'compact' ? 'h-16' : 'h-20'} border-b ${borderColor}`}>
          <div className="flex items-center gap-2 px-4 w-full justify-center">
            {settings.loginScreen?.customLogo ? <img src={settings.loginScreen.customLogo} className="w-8 h-8 object-contain rounded-md" /> : <div className={`w-8 h-8 bg-${themeColor}-600 rounded-lg flex items-center justify-center flex-shrink-0`}><span className="text-white font-bold text-xl">{settings.shopName.charAt(0)}</span></div>}
            <h1 className={`text-xl font-bold tracking-tight ${textColor} truncate`}>{settings.shopName}</h1>
          </div>
        </div>
        
        <div className="p-4">
            <div className={`rounded-xl p-3 flex items-center gap-3 border ${borderColor} ${isDark ? 'bg-gray-800/40' : 'bg-gray-50'}`}>
                <div className={`w-10 h-10 rounded-full bg-${themeColor}-100 flex items-center justify-center text-${themeColor}-700`}><UserIcon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${textColor} truncate`}>{currentUser.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-green-500' : 'text-red-500'}`}>{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
            </div>
        </div>

        <nav className="flex-1 py-2 space-y-1">
          <NavItem view="pos" icon={ShoppingCart} label={t('pos')} />
          <NavItem view="kitchen" icon={ChefHat} label="Kitchen Prep" />
          <NavItem view="menu" icon={Tablet} label="Digital Kiosk" />
          <NavItem view="transactions" icon={Receipt} label="History & Insights" />
          <NavItem view="members" icon={UsersIcon} label={t('customers')} />
          {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <>
                <NavItem view="products" icon={Archive} label="Catalog & Stock" />
            </>
          )}
          {currentUser.role === 'admin' && (
             <>
                <NavItem view="settings" icon={Settings} label={t('settings')} />
             </>
          )}
        </nav>

        <div className="p-4 border-t border-borderColor space-y-3">
          {settings.databaseSync?.enabled && (
                <button onClick={handleManualSync} disabled={syncState === 'syncing' || !isOnline} className={`w-full ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} border ${isDark ? 'border-blue-800' : 'border-blue-100'} rounded-xl p-3 transition-all group`}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            {syncState === 'syncing' ? <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" /> : <Globe className="w-3 h-3 text-blue-500" />}
                            <span className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{syncState === 'syncing' ? t('syncing') : 'Live Sync'}</span>
                        </div>
                        <RefreshCw className={`w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    <div className={`text-[9px] ${mutedText} text-left pl-5`}>{lastSync > 0 ? `Updated ${new Date(lastSync).toLocaleTimeString()}` : 'Not synced'}</div>
                </button>
          )}
          <button onClick={onLogout} className={`flex items-center gap-2 ${mutedText} hover:text-red-500 transition-colors text-sm font-medium w-full px-2`}><LogOut className="w-4 h-4" /> {t('logout')}</button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

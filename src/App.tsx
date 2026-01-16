
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import POSView from './components/POSView';
import ProductManager from './components/ProductManager';
import Dashboard from './components/Dashboard';
import TransactionsList from './components/TransactionsList';
import SettingsView from './components/SettingsView';
import MemberManager from './components/MemberManager';
import StockManager from './components/StockManager';
import CustomerMenuView from './components/CustomerMenuView';
import KitchenView from './components/KitchenView';
import { Product, Transaction, ViewState, ShopSettings, User, Member, StockPurchase, PendingOrder, HeldCart, OrderStatus, CartItem } from './types';
import { loadProducts, saveProducts, loadTransactions, saveTransaction, loadSettings, saveSettings, loadMembers, saveMembers, loadStockPurchases, saveStockPurchase, loadPendingOrders, savePendingOrders, loadHeldCarts, saveHeldCarts, loadUsers } from './services/storageService';
import { performDatabaseSync, fetchFromHost, syncRecordImmediately } from './services/syncService';
import { Menu, CloudLightning } from 'lucide-react';

const App: React.FC = () => {
  // Utility to check for Kiosk parameters
  const getKioskParams = () => {
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
    return {
      isKiosk: params.get('mode') === 'kiosk',
      table: params.get('table')
    };
  };

  const kioskParams = getKioskParams();

  // Initialize state synchronously for immediate render
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadUsers()[0]);
  const [isKioskMode, setIsKioskMode] = useState<boolean>(kioskParams.isKiosk);
  const [currentView, setCurrentView] = useState<ViewState>(kioskParams.isKiosk ? 'menu' : 'pos');
  
  const [products, setProducts] = useState<Product[]>(() => loadProducts());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [members, setMembers] = useState<Member[]>(() => loadMembers());
  const [stockPurchases, setStockPurchases] = useState<StockPurchase[]>(() => loadStockPurchases());
  const [settings, setSettings] = useState<ShopSettings>(() => loadSettings());
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(() => loadPendingOrders());
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [preselectedMember, setPreselectedMember] = useState<Member | null>(null);
  const [isInitialSyncing, setIsInitialSyncing] = useState(false);
  
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
      const stored = loadHeldCarts();
      if (stored && stored.length > 0) return stored;
      return [{ id: 'initial', name: 'Order 1', items: [], member: null, pointsToRedeem: 0, appliedCoupon: null, orderNote: '', createdAt: Date.now() }];
  });

  const [activeCartId, setActiveCartId] = useState<string>(() => heldCarts[0]?.id || 'initial');

  useEffect(() => {
    // Initial sync check if online and enabled
    const syncOnLoad = async () => {
        if (navigator.onLine && settings.databaseSync?.enabled) {
            setIsInitialSyncing(true);
            const result = await fetchFromHost();
            if (result.success) {
                setProducts(loadProducts());
                setTransactions(loadTransactions());
                setMembers(loadMembers());
                setStockPurchases(loadStockPurchases());
                setSettings(loadSettings());
            }
            setIsInitialSyncing(false);
        }
    };
    syncOnLoad();
  }, []);

  // Persistence triggers
  useEffect(() => { savePendingOrders(pendingOrders); }, [pendingOrders]);
  useEffect(() => { if (heldCarts.length > 0) saveHeldCarts(heldCarts); }, [heldCarts]);

  useEffect(() => {
    const syncInterval = setInterval(async () => {
        if (navigator.onLine && settings.databaseSync?.enabled) {
            window.dispatchEvent(new Event('sync-start'));
            await performDatabaseSync();
            window.dispatchEvent(new Event('sync-complete'));
        }
    }, 300000);
    return () => clearInterval(syncInterval);
  }, [settings.databaseSync?.enabled]);

  const handleProductUpdate = (newProducts: Product[]) => {
    setProducts(newProducts);
    saveProducts(newProducts);
    syncRecordImmediately('product', newProducts);
  };

  const handleSettingsUpdate = (newSettings: ShopSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    performDatabaseSync();
  };

  const handleMemberUpdate = (newMembers: Member[]) => {
      setMembers(newMembers);
      saveMembers(newMembers);
      syncRecordImmediately('member', newMembers);
  };

  const handlePurchaseComplete = (stockPurchase: StockPurchase) => {
      const updatedPurchases = [stockPurchase, ...stockPurchases];
      setStockPurchases(updatedPurchases);
      saveStockPurchase(stockPurchase);
  };

  const getStation = (item: CartItem) => {
      if (['Drinks', 'Coffee'].includes(item.category)) return 'drinks';
      if (['Bakery'].includes(item.category)) return 'bakery';
      return 'kitchen';
  };

  const handleMenuOrderSubmit = (order: PendingOrder) => {
      const stationStatuses: Record<string, OrderStatus> = {};
      order.items.forEach(item => {
          stationStatuses[getStation(item)] = 'pending';
      });
      const orderWithStations = { ...order, stationStatuses };
      setPendingOrders(prev => [...prev, orderWithStations]);
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, stationId?: string) => {
      if (status === 'completed') {
          setPendingOrders(prev => prev.filter(o => o.id !== orderId));
          return;
      }

      setPendingOrders(prev => prev.map(o => {
          if (o.id !== orderId) return o;
          
          if (stationId) {
              const newStationStatuses = { ...o.stationStatuses, [stationId]: status };
              const allReady = Object.values(newStationStatuses).every(s => s === 'ready');
              return { 
                  ...o, 
                  stationStatuses: newStationStatuses,
                  status: allReady ? 'ready' : (Object.values(newStationStatuses).some(s => s === 'preparing') ? 'preparing' : 'pending')
              };
          }
          
          return { ...o, status };
      }));
  };

  const handleTransactionComplete = (transaction: Transaction) => {
    const txWithUser = { ...transaction, cashierId: currentUser?.id, cashierName: currentUser?.name };
    
    // STRICT STOCK DEDUCTION
    const updatedProducts = products.map(p => {
        const cartItem = transaction.items.find(i => i.id === p.id);
        if (cartItem && p.trackInventory) {
            return { ...p, stock: Math.max(0, (p.stock || 0) - cartItem.quantity) };
        }
        return p;
    });
    
    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    // Membership Logic
    if (txWithUser.memberId && settings.membership.enabled) {
        const updatedMembers = members.map(m => {
            if (m.id === txWithUser.memberId) {
                const earned = txWithUser.pointsEarned || 0;
                const redeemed = txWithUser.pointsRedeemed || 0;
                const newPoints = Math.max(0, m.points + earned - redeemed);
                return { ...m, points: newPoints, lastUpdated: Date.now() };
            }
            return m;
        });
        setMembers(updatedMembers);
        saveMembers(updatedMembers);
    }

    const updatedTxs = [txWithUser, ...transactions];
    setTransactions(updatedTxs);
    saveTransaction(txWithUser);
    syncRecordImmediately('transaction', txWithUser);
  };

  if (isKioskMode) {
      return (
        <div className={`h-screen ${settings.appearance.backgroundColor}`}>
            <CustomerMenuView 
                products={products} 
                settings={settings} 
                onSubmitOrder={handleMenuOrderSubmit}
            />
        </div>
      );
  }

  if (!currentUser) return <div className="flex items-center justify-center h-screen font-black text-2xl uppercase tracking-tighter">System Critical: No Admin Account Found</div>;

  const layoutMode = settings.appearance.layoutMode || 'desktop';
  const getLayoutClasses = () => {
    if (layoutMode === 'mobile') return 'max-w-[430px] mx-auto shadow-2xl border-x border-gray-200';
    if (layoutMode === 'tablet') return 'max-w-[1024px] mx-auto shadow-2xl border-x border-gray-200';
    return 'w-full';
  };

  const isDark = settings.appearance.backgroundColor.includes('900') || settings.appearance.backgroundColor.includes('800');

  return (
    <div className={`flex h-screen bg-gray-950 items-center justify-center overflow-hidden`}>
      <div className={`flex h-full ${getLayoutClasses()} ${settings.appearance.backgroundColor} ${settings.appearance.fontSize} ${settings.appearance.textColor} overflow-hidden font-sans transition-all duration-500`}>
        {/* Mobile Navbar with Theme Awareness */}
        <div className={`md:hidden fixed top-0 left-0 right-0 h-16 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} z-20 border-b flex items-center px-4 justify-between shadow-sm`}>
          <div className="flex items-center gap-2">
              <div className={`w-8 h-8 bg-${settings.appearance.themeColor}-600 rounded-lg flex items-center justify-center shadow-sm`}>
                  <span className="text-white font-black text-lg">{settings.shopName.charAt(0)}</span>
              </div>
              <h1 className={`text-lg font-black truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{settings.shopName}</h1>
          </div>
          <button 
              onClick={() => setIsMobileOpen(true)} 
              className={`p-2.5 rounded-xl ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} transition-all active:scale-95`}
          >
              <Menu />
          </button>
        </div>

        <Sidebar currentView={currentView} setView={setCurrentView} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} settings={settings} currentUser={currentUser} onLogout={() => {}} />
        
        <main className="flex-1 h-full overflow-hidden pt-16 md:pt-0 relative">
          {isInitialSyncing && (
              <div className="absolute top-4 right-4 z-50 bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg animate-pulse">
                  <CloudLightning className="w-3 h-3" /> Updating from Cloud...
              </div>
          )}
          
          {currentView === 'menu' && (
              <CustomerMenuView 
                  products={products} 
                  settings={settings} 
                  onSubmitOrder={handleMenuOrderSubmit}
                  onBack={() => setCurrentView('pos')}
              />
          )}

          {currentView === 'kitchen' && (
              <KitchenView 
                  orders={pendingOrders} 
                  onUpdateStatus={handleUpdateOrderStatus} 
                  settings={settings} 
              />
          )}

          {currentView === 'pos' && (
              <POSView 
                  products={products} 
                  members={members} 
                  onTransactionComplete={handleTransactionComplete} 
                  settings={settings} 
                  onSettingsUpdate={handleSettingsUpdate}
                  initialMember={preselectedMember}
                  onClearInitialMember={() => setPreselectedMember(null)}
                  pendingOrders={pendingOrders}
                  onRemovePendingOrder={(id) => setPendingOrders(prev => prev.filter(o => o.id !== id))}
                  heldCarts={heldCarts}
                  setHeldCarts={setHeldCarts}
                  activeCartId={activeCartId}
                  setActiveCartId={setActiveCartId}
              />
          )}

          {currentView === 'products' && (
              <ProductManager 
                  products={products} 
                  setProducts={handleProductUpdate} 
                  settings={settings} 
                  onSettingsUpdate={handleSettingsUpdate}
                  purchases={stockPurchases}
                  onPurchaseComplete={handlePurchaseComplete}
              />
          )}

          {currentView === 'transactions' && (
              <TransactionsList 
                  transactions={transactions} 
                  settings={settings} 
              />
          )}

          {currentView === 'settings' && (
              <SettingsView 
                  settings={settings} 
                  onSave={handleSettingsUpdate} 
                  currentUser={currentUser} 
              />
          )}

          {currentView === 'members' && (
              <MemberManager 
                  members={members} 
                  setMembers={handleMemberUpdate} 
                  settings={settings} 
                  onSelectMemberForOrder={(m) => { setPreselectedMember(m); setCurrentView('pos'); }} 
                  currentUser={currentUser}
              />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

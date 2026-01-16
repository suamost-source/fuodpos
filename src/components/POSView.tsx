import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, CartItem, Transaction, ShopSettings, Member, AddonOption, AddonGroup, PaymentDetail, Coupon, User, Category, PendingOrder, HeldCart, OrderStatus } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, X, ShoppingCart, User as UserIcon, Tag, Printer, Mail, Send, CheckCircle, Loader2, Sparkles, Receipt, QrCode, ScanBarcode, Gift, Percent, AlertCircle, Award, Wallet, Snowflake, FileText, Info, LayoutGrid, LayoutList, Maximize2, Minimize2, Clock, ListChecks, Edit3, Trash, ChefHat, MapPin, Utensils, Coffee, Croissant, ChevronRight, ArrowRight, ArrowLeft, MessageSquare } from 'lucide-react';
import { generateReceiptNote } from '../services/geminiService';
import { printReceipt, generateReceiptEmailHtml } from '../services/printerService';
import { getTranslation } from '../utils/translations';

declare global {
  interface Window {
    emailjs: any;
    QRious: any;
  }
}

interface FlyingItem {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
}

interface POSViewProps {
  products: Product[];
  members?: Member[];
  onTransactionComplete: (transaction: Transaction) => void;
  settings: ShopSettings;
  onSettingsUpdate?: (settings: ShopSettings) => void;
  initialMember?: Member | null;
  onClearInitialMember?: () => void;
  pendingOrders?: PendingOrder[];
  onRemovePendingOrder?: (id: string) => void;
  heldCarts: HeldCart[];
  setHeldCarts: React.Dispatch<React.SetStateAction<HeldCart[]>>;
  activeCartId: string;
  setActiveCartId: React.Dispatch<React.SetStateAction<string>>;
}

const StationBadge: React.FC<{ station: string, status: OrderStatus }> = ({ station, status }) => {
    const getIcon = () => {
        switch(station) {
            case 'drinks': return <Coffee className="w-3 h-3" />;
            case 'bakery': return <Croissant className="w-3 h-3" />;
            default: return <Utensils className="w-3 h-3" />;
        }
    };
    
    return (
        <div 
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
                status === 'ready' 
                ? 'bg-green-100 border-green-200 text-green-700' 
                : status === 'preparing' 
                    ? 'bg-amber-100 border-amber-200 text-amber-700 animate-pulse' 
                    : 'bg-gray-100 border-gray-200 text-gray-400'
            }`} 
            title={`${station}: ${status}`}
        >
            {getIcon()}
            <span className="text-[9px] font-black uppercase">{station?.charAt(0) || '?'}</span>
            {status === 'ready' && <CheckCircle className="w-2.5 h-2.5" />}
        </div>
    );
};

const POSView: React.FC<POSViewProps> = ({ 
  products, 
  members = [],
  onTransactionComplete, 
  settings, 
  onSettingsUpdate,
  initialMember,
  onClearInitialMember,
  pendingOrders = [],
  onRemovePendingOrder,
  heldCarts = [],
  setHeldCarts,
  activeCartId,
  setActiveCartId
}) => {
  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  
  const activeCart = useMemo(() => {
      const found = heldCarts.find(c => c.id === activeCartId);
      if (found) return found;
      if (heldCarts.length > 0) return heldCarts[0];
      return { id: 'fallback', name: 'New Order', items: [], member: null, pointsToRedeem: 0, appliedCoupon: null, orderNote: '', createdAt: Date.now() };
  }, [heldCarts, activeCartId]);

  const cart = activeCart.items || [];
  const member = activeCart.member;
  const pointsToRedeem = Number(activeCart.pointsToRedeem || 0);
  const appliedCoupon = activeCart.appliedCoupon;
  const orderNote = activeCart.orderNote || '';

  const updateActiveCart = (updates: Partial<HeldCart>) => {
      setHeldCarts((prev: HeldCart[]) => prev.map(c => c.id === activeCartId ? { ...c, ...updates } : c));
  };

  const createNewCart = () => {
      const newId = Date.now().toString();
      const nextNum = heldCarts.length + 1;
      const newCart: HeldCart = { id: newId, name: `Order ${nextNum}`, items: [], member: null, pointsToRedeem: 0, appliedCoupon: null, orderNote: '', createdAt: Date.now() };
      setHeldCarts(prev => [...prev, newCart]);
      setActiveCartId(newId);
  };

  const removeCart = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (heldCarts.length <= 1) { updateActiveCart({ items: [], member: null, pointsToRedeem: 0, appliedCoupon: null, orderNote: '' }); return; }
      const newHeld = heldCarts.filter(c => c.id !== id);
      setHeldCarts(newHeld);
      if (activeCartId === id) setActiveCartId(newHeld[newHeld.length - 1].id);
  };

  const renameCart = (id: string, newName: string) => { 
      setHeldCarts(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c)); 
  };

  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPendingOrdersModalOpen, setIsPendingOrdersModalOpen] = useState(false);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [selectedProductForAddon, setSelectedProductForAddon] = useState<Product | null>(null);
  const [tempAddons, setTempAddons] = useState<Record<string, AddonOption[]>>({}); 
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [showMemberResults, setShowMemberResults] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentDetail[]>([]);
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const [activePaymentMethodId, setActivePaymentMethodId] = useState<string>('');
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [tempPointsRedeem, setTempPointsRedeem] = useState<string>('0');

  const { themeColor, backgroundColor, inputBackground, textColor, productIconSize = 'normal' } = settings.appearance;
  const currency = settings.currency || '$';
  const sp = '\u00A0'; 
  const t = (key: any) => getTranslation(settings.language, key);

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
        m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
        m.phone?.includes(memberSearchTerm)
    );
  }, [members, memberSearchTerm]);

  const currentSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
        const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + (Number(a.price) || 0), 0);
        return sum + ((Number(item.price) || 0) + addonsPrice) * (Number(item.quantity) || 0);
    }, 0);
  }, [cart]);

  const currentDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const value = Number(appliedCoupon.value) || 0;
    if (appliedCoupon.type === 'percent') return (currentSubtotal * value) / 100;
    if (appliedCoupon.type === 'fixed') return value;
    return 0;
  }, [currentSubtotal, appliedCoupon]);

  const pointsDiscountValue = useMemo(() => {
    if (!settings.membership?.enabled || !member || (Number(settings.membership?.redeemRate) || 0) <= 0) return 0;
    return pointsToRedeem / settings.membership.redeemRate;
  }, [pointsToRedeem, settings.membership, member]);

  const itemsPointsCost = useMemo(() => {
    return cart.filter(i => i.isReward).reduce((sum, i) => sum + (Number(i.pointsCost) || 0) * (Number(i.quantity) || 0), 0);
  }, [cart]);

  const totalPointsRedeemed = pointsToRedeem + itemsPointsCost;

  const taxRatePercent = useMemo(() => {
    return (settings.taxRates || []).filter(tr => tr.enabled).reduce((sum, tr) => sum + (Number(tr.rate) || 0), 0);
  }, [settings.taxRates]);

  const subtotalAfterDiscount = Math.max(0, currentSubtotal - currentDiscount - pointsDiscountValue);
  const currentTax = subtotalAfterDiscount * (taxRatePercent / 100);
  const currentTotal = subtotalAfterDiscount + currentTax;

  const currentPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const currentDue = Math.max(0, currentTotal - currentPaid);

  const isDark = backgroundColor.includes('900') || backgroundColor.includes('800');
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const secondaryBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200';

  const sizeConfig = useMemo(() => {
    switch (productIconSize) {
        case 'large': return { grid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', img: 'w-full aspect-square', title: 'text-sm font-bold', price: 'text-base' };
        case 'enlarge': return { grid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', img: 'w-full aspect-square h-auto', title: 'text-base font-extrabold', price: 'text-lg' };
        default: return { grid: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', img: 'w-20 h-20', title: 'text-xs', price: 'text-sm' };
    }
  }, [productIconSize]);

  const activeCategories = useMemo(() => {
      const allCats = (settings.categories || []).filter(c => c.showInPos !== false);
      if (selectedParentId) {
          return allCats.filter(c => c.parentId === selectedParentId);
      }
      return allCats.filter(c => !c.parentId);
  }, [settings.categories, selectedParentId]);

  const filteredProducts = useMemo(() => products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesCategory = true;
      
      if (selectedCategoryId !== 'all') {
          const categoryObj = (settings.categories || []).find(c => c.id === selectedCategoryId);
          if (categoryObj) {
              const children = (settings.categories || []).filter(c => c.parentId === categoryObj.id).map(c => c.name);
              const branchNames = [categoryObj.name, ...children];
              matchesCategory = branchNames.includes(p.category);
          } else {
              matchesCategory = p.category === selectedCategoryId;
          }
      } else if (selectedParentId) {
          const parentObj = (settings.categories || []).find(c => c.id === selectedParentId);
          if (parentObj) {
              const children = (settings.categories || []).filter(c => c.parentId === parentObj.id).map(c => c.name);
              const branchNames = [parentObj.name, ...children];
              matchesCategory = branchNames.includes(p.category);
          }
      }

      const respectInventoryVisibility = !settings.hideOutOfStock || (p.trackInventory ? (p.stock || 0) > 0 : true);
      return matchesSearch && matchesCategory && respectInventoryVisibility;
  }), [products, searchQuery, selectedCategoryId, selectedParentId, settings.hideOutOfStock, settings.categories]);

  const handleCategoryClick = (cat: Category | { id: string, name: string }) => {
      if (cat.id === 'all') {
          setSelectedCategoryId('all');
          return;
      }
      const category = cat as Category;
      const hasChildren = (settings.categories || []).some(c => c.parentId === category.id);
      if (hasChildren && !selectedParentId) {
          setSelectedParentId(category.id);
          setSelectedCategoryId('all');
      } else {
          setSelectedCategoryId(category.id);
      }
  };

  const handleBackCategory = () => {
      setSelectedParentId(null);
      setSelectedCategoryId('all');
  };

  const handleProductClick = (e: React.MouseEvent, product: Product) => {
    if (product.trackInventory) { const currentInCart = cart.filter(i => i.id === product.id).reduce((sum, i) => sum + i.quantity, 0); if ((product.stock || 0) <= currentInCart) { alert(`Insufficient stock for ${product.name}! Only ${product.stock || 0} available.`); return; } }
    if (product.addons && product.addons.length > 0) { setSelectedProductForAddon(product); setTempAddons({}); } 
    else { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); triggerFlyAnimation(rect, product.color || ''); addToCart(product, []); }
  };

  const addToCart = (product: Product, addons: AddonOption[], isReward: boolean = false) => {
      const pointsCost = isReward ? (product.pointsPrice || Math.ceil(product.price * settings.membership.redeemRate)) : 0;
      const existingIdx = cart.findIndex(item => item.id === product.id && JSON.stringify(item.selectedAddons) === JSON.stringify(addons) && item.isReward === isReward);
      if (existingIdx >= 0) { const newItems = [...cart]; newItems[existingIdx].quantity += 1; updateActiveCart({ items: newItems }); } 
      else { updateActiveCart({ items: [...cart, { ...product, quantity: 1, selectedAddons: addons, cartId: `${product.id}-${Date.now()}`, isReward, pointsCost, price: isReward ? 0 : product.price }] }); }
      setSelectedProductForAddon(null); setTempAddons({}); if (isReward) setIsRedeemModalOpen(false);
  };

  const updateQuantity = (index: number, delta: number) => {
      const newItems = [...cart];
      const item = newItems[index];
      if (delta > 0) {
          const product = products.find(p => p.id === item.id);
          if (product?.trackInventory) { const currentTotalInCart = newItems.filter(i => i.id === item.id).reduce((sum, i) => sum + i.quantity, 0); if ((product.stock || 0) <= currentTotalInCart) { alert(`Maximum stock reached for ${product.name}.`); return; } }
          if (item.isReward && member) { if (member.points < (totalPointsRedeemed) + (Number(item.pointsCost) || 0)) { alert("Insufficient points."); return; } }
      }
      newItems[index].quantity += delta;
      if (newItems[index].quantity <= 0) newItems.splice(index, 1);
      updateActiveCart({ items: newItems });
  };

  const removeItem = (index: number) => { const newItems = [...cart]; newItems.splice(index, 1); updateActiveCart({ items: newItems }); };

  const clearCart = () => { if (cart.length > 0 && !confirm("Discard current order?")) return; updateActiveCart({ items: [], member: null, pointsToRedeem: 0, appliedCoupon: null, orderNote: '' }); if (onClearInitialMember) onClearInitialMember(); };

  const toggleAddon = (group: AddonGroup, option: AddonOption) => {
      const current = tempAddons[group.id] || [];
      const isSelected = current.some(o => o.id === option.id);
      let nextAddons: Record<string, AddonOption[]> = { ...tempAddons };
      if (group.multiple) nextAddons[group.id] = isSelected ? current.filter(o => o.id !== option.id) : [...current, option];
      else nextAddons[group.id] = isSelected && !group.required ? [] : [option];
      setTempAddons(nextAddons);
  };

  const confirmAddons = () => { if (!selectedProductForAddon) return; const missing = selectedProductForAddon.addons?.find(g => g.required && (!tempAddons[g.id] || tempAddons[g.id].length === 0)); if (missing) { alert(`Please select ${missing.name}`); return; } addToCart(selectedProductForAddon, Object.values(tempAddons).flat() as AddonOption[]); };

  const addPayment = () => { const amount = parseFloat(tenderAmount); if (isNaN(amount) || amount <= 0) return; const method = settings.paymentMethods.find(p => p.id === activePaymentMethodId); if (!method) return; setPayments([...payments, { methodId: method.id, methodName: method.name, amount: amount }]); setTenderAmount(''); };

  const handleImportPendingOrder = (order: PendingOrder) => {
      if (!order) return;
      const newCartId = `imported-${order.id}`;
      const existing = heldCarts.find(c => c.id === newCartId);
      
      if (existing) {
          setActiveCartId(newCartId);
      } else {
          const newCart: HeldCart = { 
              id: newCartId, 
              name: order.customerName || `Ticket ${order.ticketNumber}`, 
              ticketNumber: order.ticketNumber, 
              items: order.items || [], 
              member: null, 
              pointsToRedeem: 0, 
              appliedCoupon: null, 
              orderNote: '', 
              createdAt: order.timestamp || Date.now() 
          };
          setHeldCarts(prev => [...prev, newCart]);
          setActiveCartId(newCartId);
      }
      setIsPendingOrdersModalOpen(false);
  };

  const completeOrder = async () => {
      if (Math.abs(currentDue) > 0.01) return;
      const pointsEarned = (settings.membership?.enabled && member) ? Math.floor(currentTotal * settings.membership.earnRate) : 0;
      const displayName = member?.name || (activeCart.name.startsWith('Order ') ? 'Guest' : activeCart.name);
      const tx: Transaction = { id: Date.now().toString(), orderNumber: `${settings.orderPrefix}${settings.nextOrderNumber}`, timestamp: Date.now(), items: cart, subtotal: currentSubtotal, discount: currentDiscount + pointsDiscountValue, couponCode: appliedCoupon?.code, taxTotal: currentTax, total: currentTotal, currency: settings.currency, payments: payments, note: orderNote, memberId: member?.id, memberName: displayName, pointsEarned, pointsRedeemed: totalPointsRedeemed };
      onTransactionComplete(tx);
      if (onSettingsUpdate) onSettingsUpdate({ ...settings, nextOrderNumber: settings.nextOrderNumber + 1 });
      const originalOrderId = activeCartId.replace('imported-', '');
      if (pendingOrders.some(po => po.id === originalOrderId)) onRemovePendingOrder?.(originalOrderId);
      setCompletedTransaction(tx); setIsPaymentModalOpen(false); setIsReceiptModalOpen(true);
      if (settings.receipt?.autoPrint) printReceipt(tx, settings);
  };

  const handleSendInstantEmail = async () => {
      if (!settings.emailConfig?.serviceId || !settings.emailConfig?.publicKey) { alert("Email not configured. Visit Shop Settings."); return; }
      if (!emailAddress || !completedTransaction) return;
      setIsSendingEmail(true);
      try {
          const templateParams = {
              to_email: emailAddress, to_name: completedTransaction.memberName || 'Customer', shop_name: settings.shopName,
              order_number: completedTransaction.orderNumber, total: `${completedTransaction.currency}${sp}${completedTransaction.total.toFixed(2)}`,
              receipt_html: generateReceiptEmailHtml(completedTransaction, settings)
          };
          await window.emailjs.send(settings.emailConfig.serviceId, settings.emailConfig.templateId, templateParams, settings.emailConfig.publicKey);
          setEmailSent(true);
      } catch (err) { alert("Email failed. Check configuration."); }
      finally { setIsSendingEmail(false); }
  };

  const handleCloseReceipt = () => {
      setIsReceiptModalOpen(false); setCompletedTransaction(null); setEmailSent(false); setEmailAddress(''); setIsEmailModalOpen(false);
      if (heldCarts.length > 1) { 
          const newHeld = heldCarts.filter((c: HeldCart) => c.id !== activeCartId); 
          setHeldCarts(newHeld); 
          setActiveCartId(newHeld[newHeld.length - 1].id); 
      } 
      else updateActiveCart({ items: [], member: null, pointsToRedeem: 0, appliedCoupon: null, orderNote: '' });
  };

  const handleApplyPoints = () => { const pts = parseInt(tempPointsRedeem) || 0; if (pts > (member?.points || 0)) { alert("Insufficient points balance."); return; } updateActiveCart({ pointsToRedeem: pts }); setIsRedeemModalOpen(false); };

  const triggerFlyAnimation = (rect: DOMRect, color: string = `bg-${themeColor}-500`) => {
    const targetEl = document.getElementById('cart-target');
    if (!targetEl) return;
    const targetRect = targetEl.getBoundingClientRect();
    const newItem: FlyingItem = { id: Date.now(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, targetX: (targetRect.left + targetRect.width / 2) - (rect.left + rect.width / 2), targetY: (targetRect.top + targetRect.height / 2) - (rect.top + targetRect.height / 2), color: color };
    setFlyingItems(prev => [...prev, newItem]);
    setTimeout(() => setFlyingItems(prev => prev.filter(item => item.id !== newItem.id)), 850);
  };

  useEffect(() => {
      if (isPaymentModalOpen && currentDue > 0) setTenderAmount(currentDue.toFixed(2));
  }, [isPaymentModalOpen, currentDue]);

  return (
    <div className={`flex h-full flex-col overflow-hidden ${textColor}`}>
      <div className={`flex items-center gap-2 p-2 ${cardBg} border-b ${borderColor} overflow-x-auto scrollbar-hide shadow-inner`}>
          <div className={`flex-shrink-0 p-2 text-${themeColor}-600`}><ListChecks className="w-5 h-5" /></div>
          {heldCarts.map(hc => (
              <div key={hc.id} onClick={() => setActiveCartId(hc.id)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all cursor-pointer group min-w-[120px] ${activeCartId === hc.id ? `bg-${themeColor}-600 border-${themeColor}-600 text-white shadow-md` : `${secondaryBg} ${borderColor} ${mutedText} hover:bg-gray-100`}`}>
                  {editingCartId === hc.id ? (<input autoFocus className="bg-transparent border-none outline-none text-sm font-bold w-20 text-inherit" value={hc.name} onChange={(e) => renameCart(hc.id, e.target.value)} onBlur={() => setEditingCartId(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingCartId(null)} />) : (<div className="flex flex-col min-w-0"><span className="text-sm font-bold truncate max-w-[110px] leading-tight">{hc.name}</span>{hc.ticketNumber && (<span className={`text-[10px] font-black uppercase tracking-tighter ${activeCartId === hc.id ? 'text-white/80' : 'text-blue-500'}`}>#{hc.ticketNumber}</span>)}</div>)}
                  <div className="flex items-center gap-1"><button onClick={(e) => { e.stopPropagation(); setEditingCartId(hc.id); }} className={`p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all ${activeCartId === hc.id ? 'text-white' : mutedText}`}><Edit3 className="w-3 h-3" /></button><button onClick={(e) => removeCart(e, hc.id)} className={`p-1 rounded-md hover:bg-red-500 hover:text-white transition-all ${activeCartId === hc.id ? 'text-white' : mutedText}`}><X className="w-3 h-3" /></button></div>
              </div>
          ))}
          <button onClick={createNewCart} className={`flex-shrink-0 p-2.5 rounded-xl border-2 border-dashed ${borderColor} ${mutedText} hover:bg-gray-100 transition-all`}><Plus className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className={`flex-1 flex flex-col ${backgroundColor} overflow-hidden`}>
            <div className={`${cardBg} p-4 border-b ${borderColor} shadow-sm z-10`}>
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1"><Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${mutedText} w-5 h-5`} /><input type="text" placeholder={t('search')} className={`w-full pl-10 pr-4 py-2 border ${borderColor} rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none ${inputBackground} ${textColor}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                    <button onClick={() => setIsPendingOrdersModalOpen(true)} className={`relative px-4 py-2 rounded-xl border-2 ${pendingOrders.length > 0 ? `border-${themeColor}-500 bg-${themeColor}-50 text-${themeColor}-700 animate-pulse` : `${borderColor} ${mutedText}`} flex items-center gap-2 font-bold text-sm transition-all`}><Clock className="w-4 h-4" /><span className="hidden sm:inline">Waiting Orders</span>{pendingOrders.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white font-black">{pendingOrders.length}</span>}</button>
                </div>
                <div className="flex gap-2 items-center overflow-x-auto pb-2 scrollbar-hide">
                    {selectedParentId && (
                        <button 
                            onClick={handleBackCategory}
                            className={`flex-shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors mr-1`}
                            title="Back to parent categories"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        onClick={() => setSelectedCategoryId('all')} 
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${selectedCategoryId === 'all' ? `bg-${themeColor}-600 text-white shadow-md` : `${secondaryBg} ${mutedText} hover:${hoverBg}`}`}
                    >
                        {t('allCategories')}
                    </button>
                    {activeCategories.map(cat => (
                        <button 
                            key={cat.id} 
                            onClick={() => handleCategoryClick(cat)} 
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${selectedCategoryId === cat.id ? `bg-${themeColor}-600 text-white shadow-md` : `${secondaryBg} ${mutedText} hover:${hoverBg}`}`}
                        >
                            {cat.name}
                            {(settings.categories || []).some(c => c.parentId === cat.id) && <ChevronRight className="w-3 h-3 opacity-50" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className={`grid ${sizeConfig.grid} gap-4`}>
                    {filteredProducts.map(product => {
                        const isOutOfStock = product.trackInventory && (product.stock || 0) <= 0;
                        const isDisabled = (product.isAvailable === false) || isOutOfStock;
                        return (
                        <button key={product.id} onClick={(e) => handleProductClick(e, product)} disabled={isDisabled} className={`${cardBg} rounded-2xl border ${borderColor} shadow-sm hover:shadow-md transition-all p-3 flex flex-col items-center text-center group relative overflow-hidden h-full ${isDisabled ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}>
                            <div className={`absolute top-0 left-0 w-full h-1.5 ${product.color || `bg-${themeColor}-500`}`}></div>
                            <div className={`${sizeConfig.img} mb-2 rounded-xl ${secondaryBg} flex items-center justify-center overflow-hidden relative`}>{product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <span className={`text-2xl font-bold text-${themeColor}-600`}>{product.name?.charAt(0) || '?'}</span>}{product.trackInventory && (<div className={`absolute bottom-0 right-0 px-2 py-1 rounded-tl-xl text-[10px] font-bold ${isOutOfStock ? 'bg-red-500 text-white' : product.stock! <= (product.minStock || 0) ? 'bg-orange-500 text-white' : `bg-${themeColor}-600 text-white`}`}>{isOutOfStock ? t('outOfStock') : `${product.stock}`}</div>)}</div>
                            <h3 className={`${sizeConfig.title} ${textColor} line-clamp-2 leading-tight min-h-[2.5em] mb-1 px-1`}>{product.name}</h3>
                            <div className="mt-auto pt-1 w-full flex items-center justify-center"><span className={`${sizeConfig.price} font-bold text-${themeColor}-600`}>{currency}{sp}{(Number(product.price) || 0).toFixed(2)}</span></div>
                        </button>
                    )})}
                </div>
            </div>
        </div>
        <div className={`w-full md:w-96 ${cardBg} border-l ${borderColor} flex flex-col shadow-xl z-20`}>
            <div className={`p-3 border-b ${borderColor} ${secondaryBg} flex justify-between items-center`}>
                <div className="flex items-center gap-1"><ShoppingCart id="cart-target" className={`w-5 h-5 text-${themeColor}-600 mr-1 flex-shrink-0`} /><span className={`text-[10px] font-black uppercase tracking-widest text-${themeColor}-600`}>{activeCart.name}</span></div>
                {member ? (
                    <div className="flex items-center gap-2 overflow-hidden w-full max-w-[200px]"><div className={`w-8 h-8 rounded-full bg-${themeColor}-100 text-${themeColor}-600 flex items-center justify-center flex-shrink-0`}><UserIcon className="w-4 h-4" /></div><div className="min-w-0 flex-1"><p className={`font-bold text-sm ${textColor} truncate`}>{member.name}</p><p className={`text-[10px] font-black text-amber-600`}>{member.points} PTS</p></div><div className="flex items-center gap-1"><button onClick={() => { setTempPointsRedeem(pointsToRedeem.toString()); setIsRedeemModalOpen(true); }} className="p-2 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm"><Gift className="w-4 h-4" /></button><button onClick={() => updateActiveCart({ member: null, pointsToRedeem: 0 })} className={`${mutedText} hover:text-red-500 p-1`}><X className="w-4 h-4" /></button></div></div>
                ) : (
                    <div className="w-full relative max-w-[180px]"><div className="relative"><Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${mutedText}`} /><input type="text" placeholder="Customer..." className={`w-full pl-8 pr-3 py-1.5 text-sm border ${borderColor} rounded-lg ${inputBackground} ${textColor} outline-none focus:ring-2 focus:ring-${themeColor}-500`} value={memberSearchTerm} onChange={(e) => { setMemberSearchTerm(e.target.value); setShowMemberResults(true); }} onFocus={() => setShowMemberResults(true)} /></div>{showMemberResults && memberSearchTerm && (<div className={`absolute top-full left-0 w-full mt-1 ${cardBg} border ${borderColor} rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto`}>{filteredMembers.map(m => (<div key={m.id} onClick={() => { updateActiveCart({ member: m }); setMemberSearchTerm(''); setShowMemberResults(false); setEmailAddress(m.email || ''); }} className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-0"><p className="text-sm font-bold">{m.name}</p><p className="text-xs text-gray-500">{m.phone}</p></div>))}</div>)}</div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className={`h-full flex flex-col items-center justify-center ${mutedText} opacity-60`}>
                        <ShoppingCart className="w-16 h-16 mb-4" />
                        <p>{t('cartEmpty')}</p>
                    </div>
                ) : cart.map((item, idx) => (
                    <div key={idx} className="border-b border-gray-100/10 pb-3">
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex-1 min-w-0 pr-2">
                                <h4 className={`text-sm font-semibold ${textColor} ${item.isReward ? 'text-amber-600' : ''} truncate`}>{item.name}</h4>
                                {item.selectedAddons && item.selectedAddons.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {item.selectedAddons.map((a, i) => (
                                            <span key={i} className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter bg-gray-50 px-1.5 py-0.5 rounded-md">+{a.name}</span>
                                        ))}
                                    </div>
                                )}
                                {item.note && (
                                    <div className="flex items-center gap-1.5 mt-1.5 text-blue-500 italic">
                                        <MessageSquare className="w-3 h-3" />
                                        <span className="text-[10px] font-medium truncate">{item.note}</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-sm font-bold shrink-0">{currency}{sp}{((Number(item.price) + (item.selectedAddons?.reduce((s,a)=>s+(Number(a.price)||0),0)||0)) * (Number(item.quantity)||0)).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border rounded-lg overflow-hidden">
                                <button onClick={() => updateQuantity(idx, -1)} className="p-1 hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                                <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                                <button onClick={() => updateQuantity(idx, 1)} className="p-1 hover:bg-gray-100"><Plus className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <div className={`p-4 ${cardBg} border-t ${borderColor} shadow-lg space-y-3`}>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-500"><span>{t('subtotal')}</span><span>{currency}{sp}{currentSubtotal.toFixed(2)}</span></div>
                    {currentDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>{t('discount')}</span><span>-{currency}{sp}{currentDiscount.toFixed(2)}</span></div>}
                    {pointsDiscountValue > 0 && <div className="flex justify-between text-amber-600 font-medium"><span>Redemption</span><span>-{currency}{sp}{pointsDiscountValue.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-xl font-bold pt-2 border-t"><span>{t('total')}</span><span>{currency}{sp}{currentTotal.toFixed(2)}</span></div>
                </div>
                <div className="flex gap-2"><button onClick={clearCart} disabled={cart.length === 0 && !member} className={`p-3.5 border ${borderColor} text-red-500 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-30`} title="Discard Order"><Trash className="w-5 h-5" /></button><button onClick={() => setIsPaymentModalOpen(true)} disabled={cart.length === 0} className={`flex-1 py-3.5 bg-${themeColor}-600 text-white rounded-xl font-bold shadow-lg hover:opacity-90 disabled:opacity-50`}>{t('charge')} {currency}{sp}{currentTotal.toFixed(2)}</button></div>
            </div>
        </div>
      </div>

      {isPendingOrdersModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
              <div className={`${cardBg} rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[85vh]`}>
                  <div className={`p-6 border-b ${borderColor} flex justify-between items-center`}>
                      <div className="flex items-center gap-3">
                          <div className={`p-3 bg-${themeColor}-100 rounded-2xl text-${themeColor}-600`}><Clock className="w-6 h-6" /></div>
                          <div><h3 className={`text-xl font-black ${textColor}`}>Waiting Orders</h3><p className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Process Kiosk Orders</p></div>
                      </div>
                      <button onClick={() => setIsPendingOrdersModalOpen(false)} className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${mutedText}`}><X className="w-6 h-6" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {!pendingOrders || pendingOrders.length === 0 ? (
                          <div className="py-20 text-center opacity-30">
                              <ChefHat className={`w-16 h-16 mx-auto mb-4 text-${themeColor}-600`} />
                              <p className="font-black uppercase tracking-tighter">No orders waiting currently</p>
                          </div>
                      ) : pendingOrders.map(order => (
                          <div key={order?.id || Math.random()} className={`${secondaryBg} border ${borderColor} rounded-[24px] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-${themeColor}-300 transition-all`}>
                              <div className="flex items-center gap-4">
                                  <div className={`w-16 h-16 rounded-[20px] bg-white border ${borderColor} flex flex-col items-center justify-center shadow-sm`}>
                                      <span className={`text-2xl font-black text-${themeColor}-600`}>#{order?.ticketNumber || '??'}</span>
                                      <span className="text-[8px] font-black uppercase text-gray-400">Ticket</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                      <h4 className={`text-lg font-black ${textColor} truncate`}>{order?.customerName || 'Guest'}</h4>
                                      <div className="flex flex-wrap gap-1.5 mt-1">
                                          {order?.stationStatuses && Object.entries(order.stationStatuses).map(([sid, stat]) => (
                                              <StationBadge key={sid} station={sid} status={stat as OrderStatus} />
                                          ))}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                  <div className="text-right flex-1 sm:flex-initial pr-2 border-r border-gray-200">
                                      <p className={`text-lg font-black text-${themeColor}-600`}>{currency}{(Number(order?.total) || 0).toFixed(2)}</p>
                                      <p className={`text-[10px] font-bold ${mutedText}`}>{order?.items?.length || 0} items</p>
                                  </div>
                                  <button onClick={() => handleImportPendingOrder(order)} className={`p-4 bg-${themeColor}-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2`}>
                                      Process <ChevronRight className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {isRedeemModalOpen && member && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
              <div className={`${cardBg} rounded-3xl shadow-2xl w-full max-sm:max-w-sm overflow-hidden animate-in zoom-in-95 duration-200`}>
                  <div className="p-6 bg-amber-500 text-white text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><Award className="w-10 h-10" /></div>
                      <h3 className="text-xl font-black uppercase tracking-widest">Redeem Rewards</h3>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                          <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Available Points</p><p className="text-3xl font-black text-amber-600">{member.points}</p></div>
                          <div className="text-right"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Redeem Value</p><p className="text-2xl font-bold text-gray-800">{currency}{sp}{(Number(tempPointsRedeem || 0) / (Number(settings.membership?.redeemRate) || 100)).toFixed(2)}</p></div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Points to Redeem</label>
                          <input type="number" className={`w-full p-4 text-2xl font-black border-2 ${borderColor} rounded-2xl outline-none focus:border-amber-500 text-center ${inputBackground} ${textColor}`} value={tempPointsRedeem} onChange={(e) => setTempPointsRedeem(e.target.value)} />
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setIsRedeemModalOpen(false)} className="flex-1 py-3.5 border rounded-2xl font-bold text-gray-400">Cancel</button>
                          <button onClick={handleApplyPoints} className="flex-[2] py-3.5 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200">Apply Redemption</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {selectedProductForAddon && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}>
                  <div className={`p-6 border-b ${borderColor} flex justify-between items-center`}>
                      <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl ${selectedProductForAddon.color || `bg-${themeColor}-500`} flex items-center justify-center text-white font-black text-2xl`}>{selectedProductForAddon.name?.charAt(0) || '?'}</div>
                          <div><h3 className={`text-xl font-black ${textColor}`}>{selectedProductForAddon.name}</h3><p className={`text-xs ${mutedText}`}>{currency}{sp}{(Number(selectedProductForAddon.price) || 0).toFixed(2)} Base Price</p></div>
                      </div>
                      <button onClick={() => setSelectedProductForAddon(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                      {selectedProductForAddon.addons?.map(group => (
                          <div key={group.id} className="animate-in slide-in-from-bottom-2">
                              <div className="flex items-center justify-between mb-4">
                                  <h4 className={`text-sm font-black ${textColor} uppercase tracking-widest`}>{group.name}</h4>
                                  {group.required && <span className="text-[9px] font-black text-white bg-red-500 px-2 py-0.5 rounded-md uppercase">Required</span>}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  {group.options.map(opt => {
                                      const isSelected = tempAddons[group.id]?.some(o => o.id === opt.id);
                                      return (
                                          <button key={opt.id} onClick={() => toggleAddon(group, opt)} className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left ${isSelected ? `border-${themeColor}-600 bg-${themeColor}-50` : `${borderColor} hover:border-gray-300`}`}>
                                              <span className={`text-xs font-bold ${isSelected ? `text-${themeColor}-700` : textColor}`}>{opt.name}</span>
                                              <span className={`text-[10px] font-black ${isSelected ? `text-${themeColor}-500` : mutedText}`}>+{currency}{sp}{(Number(opt.price) || 0).toFixed(2)}</span>
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className={`p-6 border-t ${borderColor} ${isDark ? 'bg-gray-800' : 'bg-gray-50'} flex items-center justify-between gap-6`}>
                      <button onClick={confirmAddons} className={`flex-1 py-4 bg-${themeColor}-600 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all`}>Add to Order <ChevronRight className="w-5 h-5" /></button>
                  </div>
              </div>
          </div>
      )}

      {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`${cardBg} rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[80vh]`}>
                  <div className="w-full md:w-1/3 bg-gray-900 text-white flex flex-col p-6">
                      <div className="mb-6"><p className="text-gray-400 text-sm mb-1">Total Due</p><h2 className="text-4xl font-bold">{currency}{sp}{currentTotal.toFixed(2)}</h2></div>
                      <div className="flex-1 overflow-y-auto space-y-3">{payments.map((p, i) => (<div key={i} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg"><div><p className="font-bold text-sm">{p.methodName}</p><p className="text-xs text-gray-400">{currency}{sp}{p.amount.toFixed(2)}</p></div><button onClick={() => setPayments(payments.filter((_, idx) => idx !== i))} className="text-gray-500"><Trash2 className="w-4 h-4" /></button></div>))}</div>
                      <div className="mt-auto space-y-2 border-t border-gray-700 pt-4">
                          <div className="flex justify-between text-sm"><span className="text-gray-400">Paid</span><span className="font-bold text-green-400">{currency}{sp}{currentPaid.toFixed(2)}</span></div>
                          {currentPaid > currentTotal ? (
                              <div className="flex justify-between text-xl font-bold text-amber-400 animate-in fade-in duration-300">
                                  <span>Change Due</span>
                                  <span>{currency}{sp}{(currentPaid - currentTotal).toFixed(2)}</span>
                              </div>
                          ) : (
                              <div className="flex justify-between text-xl font-bold">
                                  <span>Remaining</span>
                                  <span>{currency}{sp}{currentDue.toFixed(2)}</span>
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="w-full md:w-2/3 flex flex-col p-6">
                      <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Payment Methods</h3><button onClick={() => setIsPaymentModalOpen(false)}><X className="w-6 h-6" /></button></div>
                      <div className="flex-1 space-y-6">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{(settings.paymentMethods || []).filter(p => p.enabled).map(method => (<button key={method.id} onClick={() => setActivePaymentMethodId(method.id)} className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${activePaymentMethodId === method.id ? `border-${themeColor}-500 bg-${themeColor}-50` : borderColor}`}>{method.type === 'cash' ? <Banknote className="w-6 h-6"/> : <CreditCard className="w-6 h-6"/>}<span className="font-bold text-xs">{method.name}</span></button>))}</div>
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Amount Tendered</label>
                              <div className="flex gap-2"><div className="relative flex-1"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-2xl">{currency}{sp}</span><input type="number" className="w-full pl-20 pr-4 py-3 text-2xl font-bold border rounded-xl" value={tenderAmount} onChange={(e) => setTenderAmount(e.target.value)} /></div><button onClick={addPayment} className={`px-6 bg-${themeColor}-600 text-white rounded-xl font-bold`}>Add Payment</button></div>
                          </div>
                      </div>
                      <div className="mt-6 flex gap-3 pt-4 border-t"><button onClick={() => setIsPaymentModalOpen(false)} className="px-6 py-2 rounded-xl border font-bold">Cancel</button><button onClick={completeOrder} disabled={currentDue > 0.01} className={`flex-1 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50`}>Complete Order</button></div>
                  </div>
              </div>
          </div>
      )}

      {isReceiptModalOpen && completedTransaction && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
               <div className={`${cardBg} rounded-[32px] shadow-2xl w-full max-sm:max-w-xs max-w-sm overflow-hidden animate-in zoom-in-95 duration-300`}>
                  <div className="bg-green-500 p-8 text-center text-white relative">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-10 h-10" /></div>
                      <h2 className="text-2xl font-black">{t('success')}</h2>
                      <p className="text-green-100 font-bold opacity-80 uppercase tracking-widest text-[10px]">Order #{completedTransaction.orderNumber}</p>
                  </div>
                  <div className="p-8 text-center space-y-4">
                      {isEmailModalOpen ? (
                          <div className="animate-in slide-in-from-bottom-4">
                              {emailSent ? (
                                  <div className="py-6 text-green-600 font-bold flex flex-col items-center gap-2"><CheckCircle className="w-8 h-8" /> Receipt Sent!</div>
                              ) : (
                                  <div className="space-y-4">
                                      <input type="email" placeholder="customer@email.com" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} className="w-full p-4 border-2 rounded-2xl text-center font-bold" />
                                      <div className="flex gap-2">
                                          <button onClick={() => setIsEmailModalOpen(false)} className="flex-1 py-3 text-gray-400 font-bold">Back</button>
                                          <button onClick={handleSendInstantEmail} disabled={isSendingEmail} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">{isSendingEmail ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />} Send</button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => printReceipt(completedTransaction!, settings)} className={`flex items-center justify-center gap-2 py-4 border-2 ${borderColor} rounded-2xl font-black text-xs hover:bg-gray-50`}><Printer className="w-4 h-4" /> Print</button>
                              <button onClick={() => setIsEmailModalOpen(true)} className={`flex items-center justify-center gap-2 py-4 border-2 ${borderColor} rounded-2xl font-black text-xs hover:bg-gray-50`}><Mail className="w-4 h-4" /> Email</button>
                          </div>
                      )}
                      <button onClick={handleCloseReceipt} className={`w-full py-4 bg-${themeColor}-600 text-white rounded-2xl font-black shadow-lg shadow-${themeColor}-200 transition-all hover:scale-105 active:scale-95`}>{t('newOrder')}</button>
                  </div>
               </div>
          </div>
      )}
      
      {flyingItems.map(item => (
        <div key={item.id} className={`animate-fly-item w-4 h-4 rounded-full ${item.color}`} style={{ left: item.x, top: item.y, '--target-x': `${item.targetX}px`, '--target-y': `${item.targetY}px` } as React.CSSProperties} />
      ))}
    </div>
  );
};

export default POSView;
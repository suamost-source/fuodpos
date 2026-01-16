import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, CartItem, ShopSettings, Category, AddonGroup, AddonOption, PendingOrder } from '../types';
import { ShoppingBasket, Search, X, Plus, Minus, CheckCircle, ArrowRight, LayoutGrid, ChevronRight, User, MessageSquare, History, Ticket, MapPin, Info, ArrowLeft, Trash2, Image as ImageIcon, QrCode, PlayCircle, ChevronLeft, ShoppingBag, Star, MessageCircle, UtensilsCrossed, Sparkles } from 'lucide-react';
import { getTranslation } from '../utils/translations';

declare global {
    interface Window {
        Html5Qrcode: any;
    }
}

interface SavedTicket {
    number: string;
    timestamp: number;
    total: number;
    itemsCount: number;
    itemThumbs?: string[];
}

interface CustomerMenuViewProps {
    products: Product[];
    settings: ShopSettings;
    onSubmitOrder: (order: PendingOrder) => void;
    onBack?: () => void;
}

const CustomerMenuView: React.FC<CustomerMenuViewProps> = ({ products, settings, onSubmitOrder, onBack }) => {
    const [isStarted, setIsStarted] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [lastCustomerName, setLastCustomerName] = useState('');
    const [tableNumber, setTableNumber] = useState<string | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [lastTicketNumber, setLastTicketNumber] = useState('');
    const [savedTickets, setSavedTickets] = useState<SavedTicket[]>([]);
    
    const [showScanner, setShowScanner] = useState(false);
    const scannerRef = useRef<any>(null);
    const scannerContainerId = "menu-qr-reader";

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeMedia, setActiveMedia] = useState<'photo' | 'video'>('photo');
    const [tempAddons, setTempAddons] = useState<Record<string, AddonOption[]>>({});
    const [modalQuantity, setModalQuantity] = useState(1);
    const [modalNote, setModalNote] = useState('');
    
    const { themeColor, backgroundColor, textColor, inputBackground } = settings.appearance;
    const currency = settings.currency || '$';
    const sp = '\u00A0';
    const t = (key: any) => getTranslation(settings.language, key);

    const isDark = backgroundColor.includes('900') || backgroundColor.includes('800');
    const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
    const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const table = params.get('table');
        if (table) setTableNumber(table);
        const stored = localStorage.getItem('kiosk_tickets');
        if (stored) { try { setSavedTickets(JSON.parse(stored)); } catch (e) {} }
    }, []);

    useEffect(() => {
        if (selectedProduct) {
            setActiveMedia(selectedProduct.image ? 'photo' : 'video');
        }
    }, [selectedProduct]);

    const startScanner = async () => {
        setShowScanner(true);
        setTimeout(async () => {
            try {
                const Html5Qrcode = (window as any).Html5Qrcode;
                if (!Html5Qrcode) return;
                scannerRef.current = new Html5Qrcode(scannerContainerId);
                await scannerRef.current.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (txt: string) => handleScanResult(txt));
            } catch (err) { setShowScanner(false); }
        }, 300);
    };

    const stopScanner = async () => {
        if (scannerRef.current) { try { await scannerRef.current.stop(); } catch (e) {} scannerRef.current = null; }
        setShowScanner(false);
    };

    const handleScanResult = (decodedText: string) => {
        let tableValue = decodedText;
        try { if (decodedText.includes('?')) { const url = new URL(decodedText); tableValue = url.searchParams.get('table') || decodedText; } } catch (e) {}
        setTableNumber(tableValue); stopScanner();
    };

    const parentCategories = useMemo(() => {
        const all = { id: 'all', name: 'All' };
        const shopCats = (settings.categories || []).filter(c => !c.parentId && c.showInKiosk !== false);
        return [all, ...shopCats];
    }, [settings.categories]);

    const currentCategory = useMemo(() => settings.categories?.find(c => c.id === selectedCategoryId), [settings.categories, selectedCategoryId]);
    
    const subCategories = useMemo(() => {
        if (selectedCategoryId === 'all') return [];
        const cat = settings.categories?.find(c => c.id === selectedCategoryId);
        if (!cat) return [];
        const parentId = cat.parentId || cat.id;
        return settings.categories?.filter(c => c.parentId === parentId && c.showInKiosk !== false) || [];
    }, [settings.categories, selectedCategoryId]);

    const filteredProducts = products.filter(p => {
        const isManuallyAvailable = p.isAvailable ?? true;
        let matchesCat = true;
        if (selectedCategoryId !== 'all') {
            const targetCat = settings.categories?.find(c => c.id === selectedCategoryId);
            if (targetCat) {
                const childIds = settings.categories?.filter(c => c.parentId === targetCat.id).map(c => c.name) || [];
                const categoryNames = [targetCat.name, ...childIds];
                matchesCat = categoryNames.includes(p.category);
            } else {
                matchesCat = p.category === selectedCategoryId;
            }
        }
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const respectInventoryVisibility = !settings.hideOutOfStock || (p.trackInventory ? (p.stock || 0) > 0 : true);
        return matchesCat && matchesSearch && respectInventoryVisibility && isManuallyAvailable;
    });

    const featuredProducts = useMemo(() => products.filter(p => p.isChefSpecial && (p.isAvailable !== false)).slice(0, 8), [products]);

    const subtotal = cart.reduce((sum: number, item: CartItem) => {
        const addonsPrice = item.selectedAddons?.reduce((s: number, a: AddonOption) => s + a.price, 0) || 0;
        return sum + (item.price + addonsPrice) * item.quantity;
    }, 0);

    const handleProductClick = (product: Product) => {
        const isCurrentlyAvailable = (product.isAvailable ?? true) && (product.trackInventory ? (product.stock || 0) > 0 : true);
        if (!isCurrentlyAvailable) return;
        setSelectedProduct(product);
        setTempAddons({});
        setModalQuantity(1);
        setModalNote('');
    };

    const addToCart = (product: Product, addons: AddonOption[], qty: number, itemNote: string) => {
        if (product.trackInventory) {
            const currentTotalInCart = cart.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
            if ((product.stock || 0) < (currentTotalInCart + qty)) { alert(`Sorry, only ${product.stock || 0} units left!`); return; }
        }
        const cartId = `${product.id}-${addons.map((a: AddonOption) => a.id).sort().join('-')}-${itemNote}`;
        const existing = cart.find(i => i.cartId === cartId);
        if (existing) setCart(cart.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + qty } : i));
        else setCart([...cart, { ...product, quantity: qty, selectedAddons: addons, cartId, note: itemNote }]);
        setSelectedProduct(null);
    };

    const updateQty = (cartId: string, delta: number) => {
        setCart(cart.map(i => {
            if (i.cartId === cartId) {
                if (delta > 0 && i.trackInventory) {
                    const totalForProduct = cart.filter(item => item.id === i.id).reduce((s, item) => s + item.quantity, 0);
                    if ((i.stock || 0) <= totalForProduct) { alert("No more stock available."); return i; }
                }
                return { ...i, quantity: Math.max(0, i.quantity + delta) };
            }
            return i;
        }).filter(i => i.quantity > 0));
    };

    const handlePlaceOrder = () => {
        if (cart.length === 0 || !customerName.trim()) return;
        const ticketNum = Math.floor(1000 + Math.random() * 9000).toString();
        setLastTicketNumber(ticketNum); setLastCustomerName(customerName.trim());
        const itemThumbs = cart.slice(0, 3).map(i => i.image || '');
        const newTicket: SavedTicket = { number: ticketNum, timestamp: Date.now(), total: subtotal, itemsCount: cart.reduce((s, i) => s + i.quantity, 0), itemThumbs };
        const updatedHistory = [newTicket, ...savedTickets].slice(0, 10);
        setSavedTickets(updatedHistory);
        localStorage.setItem('kiosk_tickets', JSON.stringify(updatedHistory));
        onSubmitOrder({ id: Date.now().toString(), items: [...cart], timestamp: Date.now(), customerName: customerName.trim(), tableNumber: tableNumber || undefined, ticketNumber: ticketNum, total: subtotal, status: 'pending' });
        setCart([]); setCustomerName(''); setIsCartOpen(false); setIsSuccess(true);
    };

    const toggleAddon = (group: AddonGroup, option: AddonOption) => {
        const current = tempAddons[group.id] || [];
        const isSelected = current.some(o => o.id === option.id);
        let nextAddons: Record<string, AddonOption[]> = { ...tempAddons };
        if (group.multiple) nextAddons[group.id] = isSelected ? current.filter(o => o.id !== option.id) : [...current, option];
        else nextAddons[group.id] = isSelected && !group.required ? [] : [option];
        setTempAddons(nextAddons);
    };

    const maxAllowableQty = useMemo(() => {
        if (!selectedProduct || !selectedProduct.trackInventory) return 99;
        const inCart = cart.filter(i => i.id === selectedProduct.id).reduce((s, i) => s + i.quantity, 0);
        return Math.max(0, (selectedProduct.stock || 0) - inCart);
    }, [selectedProduct, cart]);

    const modalSubtotal = useMemo(() => {
        if (!selectedProduct) return 0;
        const addonsCost = Object.values(tempAddons).flat().reduce((sum: number, opt: any) => sum + opt.price, 0);
        return (selectedProduct.price + addonsCost) * modalQuantity;
    }, [selectedProduct, tempAddons, modalQuantity]);

    // LANDING SCREEN
    if (!isStarted) {
        return (
            <div className={`fixed inset-0 z-[150] ${backgroundColor} flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-black/10 pointer-events-none" />
                
                <div className="relative w-full max-w-4xl flex flex-col items-center text-center animate-in zoom-in-95 duration-700">
                    <div className={`w-32 h-32 md:w-48 md:h-48 rounded-[40px] md:rounded-[60px] bg-${themeColor}-600 flex items-center justify-center text-white shadow-2xl mb-8 md:mb-12 relative overflow-hidden group`}>
                        <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-1000 skew-x-12" />
                        <UtensilsCrossed className="w-16 h-16 md:w-24 md:h-24" />
                    </div>
                    
                    <h1 className={`text-4xl md:text-8xl font-black ${textColor} mb-4 tracking-tighter leading-none`}>
                        {settings.shopName}
                    </h1>
                    <p className={`text-lg md:text-3xl font-bold ${mutedText} mb-12 md:mb-20 max-w-2xl`}>
                        Premium flavors crafted for you. Tap to explore our menu.
                    </p>

                    <button 
                        onClick={() => setIsStarted(true)}
                        className={`group relative py-6 md:py-10 px-12 md:px-24 bg-${themeColor}-600 text-white rounded-[30px] md:rounded-[60px] font-black text-xl md:text-4xl shadow-2xl shadow-${themeColor}-400/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-6 md:gap-10 overflow-hidden`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <span>Tap to Start</span>
                        <ChevronRight className="w-8 h-8 md:w-14 md:h-14 group-hover:translate-x-2 transition-transform" />
                    </button>

                    <div className="mt-12 flex gap-4">
                        <div className="px-4 py-2 rounded-xl bg-white/50 backdrop-blur-md border border-gray-100 shadow-sm flex items-center gap-2">
                            <Sparkles className={`w-4 h-4 text-amber-500`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Self Ordering</span>
                        </div>
                        {tableNumber && (
                            <div className="px-4 py-2 rounded-xl bg-white/50 backdrop-blur-md border border-gray-100 shadow-sm flex items-center gap-2">
                                <MapPin className={`w-4 h-4 text-${themeColor}-600`} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{tableNumber}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="absolute bottom-10 left-10 md:bottom-20 md:left-20 flex flex-col gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-xl hover:bg-gray-50 active:scale-90 transition-all text-gray-400">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[100] ${backgroundColor} flex flex-col overflow-hidden`}>
            {/* COMPACT STICKY HEADER - MOBILE OPTIMIZED */}
            <header className={`${cardBg}/80 backdrop-blur-xl border-b ${borderColor} p-3 md:p-5 flex justify-between items-center shadow-md z-30 sticky top-0`}>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsStarted(false)} className={`p-2.5 rounded-xl hover:bg-opacity-80 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} ${mutedText}`}>
                        <ArrowLeft className="w-5 h-5 md:w-7 md:h-7" />
                    </button>
                    <div>
                        <h1 className={`text-base md:text-3xl font-black ${textColor} leading-tight tracking-tight truncate max-w-[150px]`}>{settings.shopName}</h1>
                        <div className="flex items-center gap-2">
                            <div className={`px-2 py-0.5 rounded-full bg-${themeColor}-50 flex items-center gap-1`}>
                                <div className={`w-1 h-1 rounded-full bg-${themeColor}-600 animate-pulse`} />
                                <p className={`text-[8px] uppercase tracking-widest font-black text-${themeColor}-700`}>
                                    {tableNumber || 'Digital Menu'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setIsHistoryOpen(true)} className={`p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'} ${mutedText} transition-transform active:scale-90`}>
                        <History className="w-5 h-5 md:w-7 md:h-7" />
                    </button>
                    <button 
                        onClick={() => setIsCartOpen(true)} 
                        className={`relative p-3.5 bg-${themeColor}-600 text-white rounded-2xl shadow-lg transition-all active:scale-90`}
                    >
                        <ShoppingBag className="w-5 h-5 md:w-9 md:h-9" />
                        {cart.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md">
                                {cart.reduce((s, i) => s + i.quantity, 0)}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* SEARCH & CATEGORIES - COMPACT MOBILE INFO DENSITY */}
            <div className={`p-3 md:p-6 ${cardBg} border-b ${borderColor} flex flex-col gap-3 md:gap-6 shadow-sm z-20`}>
                <div className="relative group max-w-3xl mx-auto w-full">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${mutedText} w-5 h-5 transition-colors`} />
                    <input 
                        type="text" 
                        placeholder="Search menu..." 
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 ${borderColor} ${inputBackground} ${textColor} font-bold text-sm focus:border-${themeColor}-500 outline-none transition-all placeholder-gray-400`} 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                </div>
                
                <div className="flex gap-3 md:gap-8 overflow-x-auto pb-1 scrollbar-hide">
                    {parentCategories.map(cat => (
                        <button 
                            key={cat.id} 
                            onClick={() => setSelectedCategoryId(cat.id)} 
                            className={`flex flex-col items-center gap-2 min-w-[70px] md:min-w-[120px] transition-all group ${selectedCategoryId === cat.id || (currentCategory?.parentId === cat.id) ? 'scale-105' : 'opacity-50 hover:opacity-100'}`}
                        >
                            <div className={`w-14 h-14 md:w-28 md:h-28 rounded-2xl md:rounded-[40px] overflow-hidden border-2 ${selectedCategoryId === cat.id || (currentCategory?.parentId === cat.id) ? `border-${themeColor}-500 shadow-xl ring-4 ring-${themeColor}-50` : `${borderColor} bg-white`} transition-all p-0.5`}>
                                <div className="w-full h-full rounded-xl md:rounded-[35px] overflow-hidden relative">
                                    {cat.image ? (
                                        <img src={cat.image} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center font-black text-lg md:text-4xl text-${themeColor}-600 bg-${themeColor}-50`}>
                                            {cat.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className={`text-[8px] md:text-xs font-black uppercase tracking-widest ${selectedCategoryId === cat.id || (currentCategory?.parentId === cat.id) ? `text-${themeColor}-700` : mutedText}`}>
                                {cat.name}
                            </span>
                        </button>
                    ))}
                </div>

                {subCategories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pt-1 pb-1 scrollbar-hide px-1">
                        {subCategories.map(sub => (
                            <button 
                                key={sub.id} 
                                onClick={() => setSelectedCategoryId(sub.id)} 
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${selectedCategoryId === sub.id ? `bg-${themeColor}-600 text-white border-${themeColor}-600 shadow-md` : `${borderColor} ${mutedText} bg-gray-50/50`}`}
                            >
                                {sub.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* MAIN MENU GRID - 2 COLUMNS FOR 5-6 INCH SCREENS */}
            <div className="flex-1 overflow-y-auto p-3 md:p-10 custom-scrollbar bg-gray-50/30">
                <div className="max-w-[1600px] mx-auto space-y-8 md:space-y-20">
                    
                    {/* MOBILE FEATURED SCROLLER */}
                    {selectedCategoryId === 'all' && !searchQuery && featuredProducts.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                </div>
                                <h2 className={`text-lg md:text-5xl font-black tracking-tight ${textColor}`}>Signatures</h2>
                            </div>
                            
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-3 px-3">
                                {featuredProducts.map(p => (
                                    <div 
                                        key={`feat-${p.id}`} 
                                        onClick={() => handleProductClick(p)}
                                        className="relative min-w-[200px] md:min-w-[420px] h-[280px] md:h-[600px] rounded-[30px] md:rounded-[70px] overflow-hidden shadow-xl transition-all active:scale-95 cursor-pointer group shrink-0"
                                    >
                                        {p.image ? (
                                            <img src={p.image} className="absolute inset-0 w-full h-full object-cover z-10" alt={p.name} />
                                        ) : (
                                            <div className={`absolute inset-0 w-full h-full ${p.color || `bg-${themeColor}-500`} flex items-center justify-center text-white font-black text-6xl z-10`}>{p.name.charAt(0)}</div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-20" />
                                        
                                        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-12 z-30">
                                            <h3 className="text-xl md:text-5xl font-black text-white leading-tight mb-2 tracking-tight drop-shadow-lg">{p.name}</h3>
                                            <div className="flex justify-between items-center">
                                                <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl shadow-lg">
                                                    <p className="text-sm md:text-4xl font-black text-white">{currency}{sp}{p.price.toFixed(2)}</p>
                                                </div>
                                                <div className={`w-10 h-10 md:w-24 md:h-24 rounded-xl md:rounded-[40px] bg-${themeColor}-600 text-white flex items-center justify-center shadow-lg`}>
                                                    <Plus className="w-5 h-5 md:w-12 md:h-12" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MAIN LISTING - 2 COLUMNS ON MOBILE */}
                    <div className="space-y-4 md:space-y-12">
                        <div className="flex items-center gap-3 border-b-2 border-gray-100 pb-3 md:pb-10">
                            <LayoutGrid className="w-5 h-5 md:w-12 md:h-12 text-gray-300" />
                            <h2 className="text-lg md:text-5xl font-black tracking-tight text-gray-800">
                                {selectedCategoryId === 'all' ? 'The Menu' : currentCategory?.name}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-12">
                            {filteredProducts.map(p => {
                                const isOutOfStock = p.trackInventory && (p.stock || 0) <= 0;
                                const isDisabled = (p.isAvailable === false) || isOutOfStock;
                                return (
                                    <div 
                                        key={p.id} 
                                        onClick={() => !isDisabled && handleProductClick(p)} 
                                        className={`${cardBg} rounded-[24px] md:rounded-[60px] overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group flex flex-col border-2 ${borderColor} ${isDisabled ? 'grayscale opacity-50' : 'active:scale-95'}`}
                                    >
                                        <div className="aspect-square relative overflow-hidden bg-gray-50">
                                            {p.image ? (
                                                <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                                            ) : (
                                                <div className={`w-full h-full ${p.color || `bg-${themeColor}-500`} flex items-center justify-center text-white text-4xl font-black`}>{p.name.charAt(0)}</div>
                                            )}
                                            
                                            {isDisabled && (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                                    <div className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">
                                                        Sold Out
                                                    </div>
                                                </div>
                                            )}

                                            {!isDisabled && (
                                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-lg text-xs font-black shadow-md z-20">
                                                    {currency}{p.price.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 md:p-10 flex flex-col flex-1">
                                            <h3 className={`font-black ${textColor} text-xs md:text-2xl line-clamp-2 leading-tight mb-auto tracking-tight`}>{p.name}</h3>
                                            <div className="flex justify-between items-center mt-3">
                                                <span className={`text-[7px] md:text-xs font-black uppercase tracking-widest text-gray-400`}>{p.category}</span>
                                                {!isDisabled && (
                                                    <div className={`w-7 h-7 md:w-16 md:h-16 rounded-lg md:rounded-[28px] bg-${themeColor}-50 text-${themeColor}-600 flex items-center justify-center group-hover:bg-${themeColor}-600 group-hover:text-white transition-all`}>
                                                        <Plus className="w-4 h-4 md:w-8 md:h-8" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {/* BOTTOM PADDING FOR MOBILE DRAWER */}
                <div className="h-28" />
            </div>

            {/* FLOATING ACTION BUTTON - MOBILE CART (STUCK AT BOTTOM) */}
            {cart.length > 0 && !isCartOpen && (
                <div className="fixed bottom-6 left-0 right-0 z-[90] px-4 md:hidden animate-in slide-in-from-bottom-10 duration-500">
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className={`w-full py-4 bg-${themeColor}-600 text-white rounded-2xl font-black text-base flex items-center justify-between px-6 shadow-2xl ring-4 ring-white active:scale-95 transition-all`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingBag className="w-6 h-6" />
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full text-[8px] flex items-center justify-center border-2 border-white">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
                            </div>
                            <span>Review Order</span>
                        </div>
                        <span className="text-lg">{currency}{subtotal.toFixed(2)}</span>
                    </button>
                </div>
            )}

            {/* PRODUCT MODAL - MOBILE VERTICAL STACK */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-3xl flex items-end md:items-center justify-center">
                    <div className={`${cardBg} w-full max-w-[1600px] rounded-t-[40px] md:rounded-[70px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500 flex flex-col md:flex-row h-[92vh] md:h-[95vh]`}>
                        
                        {/* LEFT MEDIA */}
                        <div className="w-full md:w-[45%] relative bg-gray-50 flex items-center justify-center p-6 md:p-12 overflow-hidden border-b md:border-b-0 md:border-r border-gray-100 shrink-0">
                            <div className="relative w-full aspect-square max-w-[280px] md:max-w-xl rounded-[30px] md:rounded-[80px] overflow-hidden shadow-xl border-[6px] border-white">
                                {activeMedia === 'photo' ? (
                                    selectedProduct.image ? (
                                        <img src={selectedProduct.image} className="w-full h-full object-cover animate-in fade-in duration-500" alt={selectedProduct.name} />
                                    ) : (
                                        <div className={`w-full h-full ${selectedProduct.color || `bg-${themeColor}-900`} flex items-center justify-center text-white text-8xl font-black`}>{selectedProduct.name.charAt(0)}</div>
                                    )
                                ) : (
                                    <video src={selectedProduct.video} className="w-full h-full object-cover animate-in fade-in" muted loop autoPlay playsInline />
                                )}
                            </div>

                            <button onClick={() => setSelectedProduct(null)} className="absolute top-6 left-6 p-4 bg-white/90 backdrop-blur-xl text-gray-800 rounded-2xl hover:bg-white transition-all shadow-lg active:scale-90 z-30">
                                <ArrowLeft className="w-6 h-6 md:w-10 md:h-10" />
                            </button>
                        </div>

                        {/* RIGHT CONTENT */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-white">
                            <div className="p-6 md:p-16 flex-1 overflow-y-auto custom-scrollbar">
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`text-[8px] md:text-sm font-black text-white bg-gray-900 px-3 py-1 rounded-lg uppercase tracking-widest`}>{selectedProduct.category}</span>
                                        {selectedProduct.isChefSpecial && (
                                            <span className="text-[8px] md:text-sm font-black text-white bg-amber-500 px-3 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-white" /> Signature
                                            </span>
                                        )}
                                    </div>
                                    <h3 className={`text-3xl md:text-8xl font-black ${textColor} mb-2 leading-none tracking-tight`}>{selectedProduct.name}</h3>
                                    <p className={`text-2xl md:text-6xl font-black text-${themeColor}-600 mb-6`}>{currency}{selectedProduct.price.toFixed(2)}</p>
                                    
                                    <div className={`p-5 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border-4 border-white shadow-md mb-8`}>
                                        <p className={`text-xs md:text-3xl ${textColor} leading-relaxed font-bold opacity-80`}>
                                            {selectedProduct.description || "An exquisite masterpiece crafted for the most discerning palates."}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-8 md:space-y-24">
                                    {selectedProduct.addons?.map(group => (
                                        <div key={group.id}>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className={`text-sm md:text-4xl font-black ${textColor} uppercase tracking-tight`}>{group.name}</h4>
                                                {group.required && <span className="text-[8px] font-black text-white bg-red-600 px-3 py-1 rounded-lg uppercase">Required</span>}
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                {group.options.map(opt => {
                                                    const isSelected = tempAddons[group.id]?.some(o => o.id === opt.id);
                                                    return (
                                                        <button key={opt.id} onClick={() => toggleAddon(group, opt)} className={`p-4 rounded-2xl border-[3px] flex items-center justify-between transition-all ${isSelected ? `border-${themeColor}-600 bg-${themeColor}-50 shadow-md` : `border-gray-50 bg-gray-50/50`}`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? `bg-${themeColor}-600 border-${themeColor}-600` : `border-gray-200 bg-white`}`}>{isSelected && <CheckCircle className="w-4 h-4 text-white" />}</div>
                                                                <span className={`text-sm font-black ${isSelected ? `text-${themeColor}-900` : textColor}`}>{opt.name}</span>
                                                            </div>
                                                            <span className={`text-xs font-black ${isSelected ? `text-${themeColor}-600` : mutedText}`}>+{currency}{opt.price.toFixed(2)}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pb-10">
                                        <h4 className={`text-sm md:text-4xl font-black ${textColor} uppercase tracking-tight mb-4`}>Special Requests</h4>
                                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border-4 border-white shadow-md`}>
                                            <textarea 
                                                className={`w-full p-2 bg-transparent outline-none border-none text-sm font-bold ${textColor} placeholder-gray-300 resize-none h-24`}
                                                placeholder="e.g. Less spicy, no onions..."
                                                value={modalNote}
                                                onChange={(e) => setModalNote(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MODAL FOOTER */}
                            <div className={`p-4 md:p-14 ${isDark ? 'bg-gray-900' : 'bg-white'} border-t-2 border-gray-50 flex flex-col items-center gap-4 shadow-xl`}>
                                <div className={`flex items-center ${isDark ? 'bg-black' : 'bg-gray-50'} p-2 rounded-2xl border-4 border-white shadow-md w-full justify-between`}>
                                    <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all border border-gray-100"><Minus className="w-6 h-6" /></button>
                                    <span className={`text-2xl font-black ${textColor}`}>{modalQuantity}</span>
                                    <button onClick={() => setModalQuantity(Math.min(maxAllowableQty, modalQuantity + 1))} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all border border-gray-100"><Plus className="w-6 h-6" /></button>
                                </div>
                                <button onClick={() => addToCart(selectedProduct, Object.values(tempAddons).flat() as AddonOption[], modalQuantity, modalNote)} className={`w-full py-5 bg-${themeColor}-600 text-white rounded-2xl font-black text-lg flex items-center justify-between px-8 shadow-xl hover:opacity-95 active:scale-95 transition-all`}>
                                    <ShoppingBasket className="w-6 h-6" />
                                    <span>Confirm</span>
                                    <span>{currency}{modalSubtotal.toFixed(2)}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* CART DRAWER - MOBILE SWIPE UP FEEL */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[170] bg-black/90 backdrop-blur-3xl flex items-end justify-center">
                    <div className={`${cardBg} w-full max-w-6xl rounded-t-[40px] shadow-2xl flex flex-col h-[94vh] overflow-hidden animate-in slide-in-from-bottom duration-500`}>
                        <div className="flex-1 flex flex-col min-w-0 bg-white">
                            <div className="p-6 border-b-2 border-gray-50 flex justify-between items-center">
                                <div>
                                    <h2 className={`text-2xl font-black ${textColor} leading-none tracking-tight uppercase`}>Order Summary</h2>
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">Review your selections</p>
                                </div>
                                <button onClick={() => setIsCartOpen(false)} className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all active:scale-90"><X className="w-6 h-6 text-gray-400" /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-10">
                                        <ShoppingBag className="w-32 h-32 mb-6" />
                                        <p className="text-2xl font-black uppercase tracking-widest text-center">Empty</p>
                                    </div>
                                ) : cart.map(item => (
                                    <div key={item.cartId} className={`flex p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border-4 border-white shadow-md gap-4`}>
                                        <div className={`w-20 h-20 rounded-xl ${item.color} flex-shrink-0 flex items-center justify-center text-white font-bold border-2 border-white shadow-md overflow-hidden`}>
                                            {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <span className="text-3xl">{item.name.charAt(0)}</span>}
                                        </div>
                                        <div className="flex-1 flex flex-col min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm font-black ${textColor} truncate pr-2`}>{item.name}</h4>
                                                <button onClick={() => updateQty(item.cartId!, -item.quantity)} className="p-2 bg-white rounded-lg shadow-sm text-red-500 active:scale-90"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <div className="flex flex-wrap gap-1 my-1.5">
                                                {item.selectedAddons?.map((a, i) => (
                                                    <span key={i} className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-2 border-white bg-white text-gray-400 shadow-sm`}>+ {a.name}</span>
                                                ))}
                                            </div>
                                            <div className="mt-auto flex justify-between items-center">
                                                <div className={`flex items-center ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-1 shadow-sm border-2 border-white`}>
                                                    <button onClick={() => updateQty(item.cartId!, -1)} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                                                    <span className={`w-8 text-center text-sm font-black ${textColor}`}>{item.quantity}</span>
                                                    <button onClick={() => updateQty(item.cartId!, 1)} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                                                </div>
                                                <p className={`text-sm font-black text-${themeColor}-600`}>{currency}{((item.price + (item.selectedAddons?.reduce((s, a) => s + a.price, 0)||0)) * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className={`w-full ${isDark ? 'bg-gray-950' : 'bg-gray-100'} p-6 flex flex-col border-t ${borderColor}`}>
                            <div className="space-y-4 mb-6">
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Pickup Name *</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                                    <input 
                                        type="text" 
                                        className={`w-full pl-12 pr-4 py-4 rounded-xl border-4 border-white ${inputBackground} ${textColor} font-black text-lg outline-none focus:border-${themeColor}-500 transition-all shadow-md placeholder-gray-300`} 
                                        value={customerName} 
                                        onChange={(e) => setCustomerName(e.target.value)} 
                                        placeholder="Your Name" 
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-auto space-y-4">
                                <div className={`p-4 rounded-2xl bg-white border-4 border-white shadow-md flex justify-between items-center`}>
                                    <span className="font-black text-xs uppercase tracking-widest opacity-30">Total Amount</span>
                                    <p className={`text-3xl font-black text-${themeColor}-600 tracking-tight`}>{currency}{subtotal.toFixed(2)}</p>
                                </div>
                                <button 
                                    onClick={handlePlaceOrder} 
                                    disabled={!customerName.trim() || cart.length === 0} 
                                    className={`w-full py-5 bg-${themeColor}-600 text-white rounded-2xl font-black text-xl shadow-xl hover:opacity-95 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-4`}
                                >
                                    <span>Place Order</span>
                                    <ArrowRight className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY OVERLAY */}
            {isHistoryOpen && (
                <div className="fixed inset-0 z-[180] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
                    <div className={`${cardBg} w-full max-w-4xl rounded-[40px] shadow-2xl flex flex-col h-[85vh] overflow-hidden animate-in zoom-in-95`}>
                        <div className="p-8 border-b-4 border-gray-50 flex justify-between items-center bg-white">
                            <h2 className={`text-2xl font-black ${textColor} uppercase`}>Your History</h2>
                            <button onClick={() => setIsHistoryOpen(false)} className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100"><X className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                            {savedTickets.length === 0 ? (
                                <div className="text-center py-20 opacity-10 flex flex-col items-center">
                                    <Ticket className="w-24 h-24 mb-6" />
                                    <p className="text-2xl font-black uppercase tracking-widest">No Records</p>
                                </div>
                            ) : savedTickets.map((ticket, i) => (
                                <div key={i} className={`p-6 rounded-[30px] border-4 border-gray-50 flex flex-col gap-4 bg-white shadow-sm`}>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-2xl font-black text-${themeColor}-600`}>#{ticket.number}</p>
                                        <p className={`text-xl font-black ${textColor}`}>{currency}{ticket.total.toFixed(2)}</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex -space-x-4">
                                            {ticket.itemThumbs?.map((thumb, idx) => (
                                                <div key={idx} className="w-12 h-12 rounded-xl border-4 border-white shadow-md overflow-hidden bg-gray-100 z-10" style={{ zIndex: 10 - idx }}>
                                                    {thumb ? <img src={thumb} className="w-full h-full object-cover" /> : <div className={`w-full h-full bg-gray-100 flex items-center justify-center text-gray-300 font-black text-xs`}>?</div>}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[8px] text-gray-300 font-black uppercase tracking-widest">{new Date(ticket.timestamp).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS SCREEN */}
            {isSuccess && (
                <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
                    <div className={`${cardBg} w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-90 duration-700 flex flex-col`}>
                        <div className={`p-10 bg-${themeColor}-600 text-white text-center flex flex-col items-center relative overflow-hidden`}>
                            <div className="w-24 h-24 bg-white/20 rounded-[30px] flex items-center justify-center mb-6 animate-bounce shadow-xl backdrop-blur-xl z-10">
                                <CheckCircle className="w-12 h-12 text-white" />
                            </div>
                            <h2 className="text-4xl font-black mb-2 tracking-tight z-10">Success!</h2>
                            <p className="text-white/50 font-black uppercase tracking-widest text-[10px] mb-6 z-10">Pickup Code</p>
                            <div className="text-8xl font-black leading-none drop-shadow-xl z-10">#{lastTicketNumber}</div>
                            <p className="text-white/80 text-lg font-bold mt-8 z-10">Enjoy your treats, {lastCustomerName}!</p>
                        </div>
                        <div className="p-8 text-center bg-white">
                            <div className="bg-amber-50 border-4 border-amber-100 rounded-3xl p-6 mb-8 shadow-inner animate-pulse">
                                <p className="text-amber-900 font-black text-lg leading-tight">
                                    Please <span className="text-red-600 underline underline-offset-4 font-black">SCREENSHOT</span> this screen <br/>
                                    to verify your order at the counter.
                                </p>
                            </div>
                            <button 
                                onClick={() => { setIsSuccess(false); setIsStarted(false); }} 
                                className={`w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4`}
                            >
                                <span>Return to Start</span>
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showScanner && (
                <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center justify-center p-6 backdrop-blur-3xl">
                    <button onClick={stopScanner} className="absolute top-10 right-10 p-6 bg-white/10 rounded-full text-white"><X className="w-8 h-8" /></button>
                    <div className="w-full max-w-sm aspect-square bg-white/5 rounded-[60px] overflow-hidden border-8 border-white/10 relative" id={scannerContainerId}>
                        <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none z-10" />
                        <div className="absolute inset-10 border-4 border-dashed border-white/30 rounded-3xl pointer-events-none animate-pulse z-20" />
                    </div>
                    <p className="text-white mt-12 text-2xl font-black uppercase tracking-widest text-center leading-tight">Scan QR</p>
                </div>
            )}
        </div>
    );
};

export default CustomerMenuView;
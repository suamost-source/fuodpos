
import React, { useState, useMemo } from 'react';
import { Product, ShopSettings, StockPurchase, User } from '../types';
import { Package, Plus, Search, History, BarChart3, ArrowDownToLine, Clock, Trash2, Truck, AlertTriangle, X, Check, ArrowUpRight } from 'lucide-react';
import { getTranslation } from '../utils/translations';

interface StockManagerProps {
  products: Product[];
  onProductUpdate: (products: Product[]) => void;
  purchases: StockPurchase[];
  onPurchaseComplete: (purchase: StockPurchase) => void;
  settings: ShopSettings;
}

const StockManager: React.FC<StockManagerProps> = ({ products, onProductUpdate, purchases, onPurchaseComplete, settings }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Purchase Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [supplier, setSupplier] = useState('');

  const t = (key: any) => getTranslation(settings.language, key);
  const { themeColor, backgroundColor, textColor } = settings.appearance;
  const isDark = backgroundColor.includes('900') || backgroundColor.includes('800');
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-100';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const sp = '\u00A0';

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.category.toLowerCase().includes(filter.toLowerCase()));
  }, [products, filter]);

  const filteredPurchases = useMemo(() => {
      return purchases.filter(p => p.productName.toLowerCase().includes(filter.toLowerCase()));
  }, [purchases, filter]);

  const handleRecordPurchase = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product || qty <= 0) return;

    const newPurchase: StockPurchase = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitCost: cost,
      supplier,
      timestamp: Date.now()
    };

    const updatedProducts = products.map(p => {
        if (p.id === product.id) {
            return { ...p, stock: (p.stock || 0) + qty };
        }
        return p;
    });

    onPurchaseComplete(newPurchase);
    onProductUpdate(updatedProducts);
    
    setIsModalOpen(false);
    setQty(0);
    setCost(0);
    setSupplier('');
    setSelectedProductId('');
  };

  const stockStats = useMemo(() => {
      const totalItems = products.reduce((sum, p) => sum + (p.stock || 0), 0);
      const lowStockCount = products.filter(p => (p.stock || 0) <= (p.minStock || 0)).length;
      const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * p.price), 0);
      return { totalItems, lowStockCount, totalValue };
  }, [products]);

  return (
    <div className={`h-full flex flex-col p-6 ${backgroundColor}`}>
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className={`${cardBg} p-5 rounded-2xl border ${borderColor} shadow-sm flex items-center gap-4`}><div className="p-3 bg-blue-100 rounded-xl text-blue-600"><Package className="w-6 h-6" /></div><div><p className={`text-xs font-bold ${mutedText} uppercase tracking-wider`}>{t('totalItems')}</p><p className={`text-2xl font-bold ${textColor}`}>{stockStats.totalItems}</p></div></div>
            <div className={`${cardBg} p-5 rounded-2xl border ${borderColor} shadow-sm flex items-center gap-4`}><div className={`p-3 rounded-xl ${stockStats.lowStockCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}><AlertTriangle className="w-6 h-6" /></div><div><p className={`text-xs font-bold ${mutedText} uppercase tracking-wider`}>{t('lowStock')}</p><p className={`text-2xl font-bold ${textColor}`}>{stockStats.lowStockCount}</p></div></div>
            <div className={`${cardBg} p-5 rounded-2xl border ${borderColor} shadow-sm flex items-center gap-4`}><div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><BarChart3 className="w-6 h-6" /></div><div><p className={`text-xs font-bold ${mutedText} uppercase tracking-wider`}>{t('totalValue')}</p><p className={`text-2xl font-bold ${textColor}`}>{settings.currency}{sp}{stockStats.totalValue.toFixed(2)}</p></div></div>
        </div>
        <div className={`${cardBg} flex-1 rounded-2xl shadow-sm border ${borderColor} flex flex-col overflow-hidden`}>
            <div className={`p-6 border-b ${borderColor} flex flex-col md:flex-row justify-between items-center gap-4`}>
                <div className={`flex bg-${isDark ? 'gray-700' : 'gray-100'} p-1 rounded-xl`}>
                    <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'inventory' ? `bg-${themeColor}-600 text-white shadow-sm` : `${mutedText} hover:text-gray-700`}`}><Package className="w-4 h-4" /> {t('stockLevels')}</button>
                    <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'history' ? `bg-${themeColor}-600 text-white shadow-sm` : `${mutedText} hover:text-gray-700`}`}><History className="w-4 h-4" /> {t('purchaseHistory')}</button>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64"><Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${mutedText} w-4 h-4`} /><input type="text" placeholder={t('search')} className={`w-full pl-9 pr-4 py-2 border ${borderColor} rounded-xl text-sm ${isDark ? 'bg-gray-700' : 'bg-white'} ${textColor} outline-none`} value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
                    <button onClick={() => setIsModalOpen(true)} className={`flex items-center gap-2 bg-${themeColor}-600 text-white px-4 py-2 rounded-xl hover:bg-${themeColor}-700 shadow-md font-bold text-sm whitespace-nowrap`}><ArrowDownToLine className="w-4 h-4" /> {t('recordPurchase')}</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'inventory' ? (
                    <table className="w-full text-left">
                        <thead className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} ${mutedText} text-xs uppercase tracking-wider sticky top-0`}><tr><th className="px-6 py-4">{t('product')}</th><th className="px-6 py-4">{t('currentStock')}</th><th className="px-6 py-4">{t('minStock')}</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Value</th></tr></thead>
                        <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {filteredProducts.map(p => {
                                const isLow = (p.stock || 0) <= (p.minStock || 0);
                                return (<tr key={p.id} className={`hover:${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} transition-colors`}><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg ${p.color} flex-shrink-0 flex items-center justify-center text-white font-bold text-xs`}>{p.name.charAt(0)}</div><div><p className={`font-bold text-sm ${textColor}`}>{p.name}</p><p className={`text-[10px] ${mutedText}`}>{p.category}</p></div></div></td><td className="px-6 py-4 font-mono font-bold text-sm">{p.stock || 0}</td><td className="px-6 py-4 text-xs text-gray-400">{p.minStock || 0}</td><td className="px-6 py-4">{isLow ? (<div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold w-fit border border-red-100"><AlertTriangle className="w-3 h-3" /> {t('lowStock')}</div>) : (<div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-full text-[10px] font-bold w-fit border border-green-100"><Check className="w-3 h-3" /> {t('inStock')}</div>)}</td><td className="px-6 py-4 text-right font-bold text-sm">{settings.currency}{sp}{((p.stock || 0) * p.price).toFixed(2)}</td></tr>);
                            })}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} ${mutedText} text-xs uppercase tracking-wider sticky top-0`}><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">{t('product')}</th><th className="px-6 py-4">{t('supplier')}</th><th className="px-6 py-4">Qty</th><th className="px-6 py-4 text-right">Cost</th></tr></thead>
                        <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {filteredPurchases.map(p => (<tr key={p.id} className={`hover:${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} transition-colors`}><td className="px-6 py-4 text-xs font-mono">{new Date(p.timestamp).toLocaleString()}</td><td className="px-6 py-4 font-bold text-sm">{p.productName}</td><td className="px-6 py-4 text-sm">{p.supplier || 'N/A'}</td><td className="px-6 py-4"><div className="flex items-center gap-1 text-emerald-600 font-bold"><ArrowUpRight className="w-3 h-3" /> +{p.quantity}</div></td><td className="px-6 py-4 text-right font-bold text-sm">{settings.currency}{sp}{(p.unitCost * p.quantity).toFixed(2)}</td></tr>))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </div>
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`${cardBg} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95`}>
                  <div className={`p-6 border-b ${borderColor} flex justify-between items-center`}><h3 className={`text-lg font-bold ${textColor}`}>{t('recordPurchase')}</h3><button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                  <div className="p-6 space-y-4">
                      <div><label className={`block text-xs font-bold ${mutedText} uppercase mb-1`}>{t('product')}</label><select className={`w-full p-3 border ${borderColor} rounded-xl ${isDark ? 'bg-gray-700' : 'bg-white'} ${textColor} text-sm`} value={selectedProductId} onChange={(e) => { setSelectedProductId(e.target.value); const prod = products.find(p => p.id === e.target.value); if (prod) setCost(prod.price * 0.7); }}><option value="">Select a Product...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock || 0} in stock)</option>)}</select></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={`block text-xs font-bold ${mutedText} uppercase mb-1`}>{t('quantity')}</label><div className="relative"><Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="number" className={`w-full pl-9 pr-4 p-3 border ${borderColor} rounded-xl ${isDark ? 'bg-gray-700' : 'bg-white'} ${textColor} text-sm font-bold`} value={qty || ''} onChange={(e) => setQty(parseInt(e.target.value) || 0)} placeholder="0" /></div></div>
                        <div><label className={`block text-xs font-bold ${mutedText} uppercase mb-1`}>{t('unitCost')}</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{settings.currency}{sp}</span><input type="number" className={`w-full pl-14 pr-4 p-3 border ${borderColor} rounded-xl ${isDark ? 'bg-gray-700' : 'bg-white'} ${textColor} text-sm`} value={cost || ''} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} placeholder="0.00" /></div></div>
                      </div>
                      <div><label className={`block text-xs font-bold ${mutedText} uppercase mb-1`}>{t('supplier')} (Optional)</label><div className="relative"><Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" className={`w-full pl-9 pr-4 p-3 border ${borderColor} rounded-xl ${isDark ? 'bg-gray-700' : 'bg-white'} ${textColor} text-sm`} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier Name" /></div></div>
                  </div>
                  <div className={`p-6 border-t ${borderColor} flex gap-3`}><button onClick={() => setIsModalOpen(false)} className={`flex-1 py-3 px-4 rounded-xl border ${borderColor} ${mutedText} font-bold text-sm`}>{t('cancel')}</button><button onClick={handleRecordPurchase} disabled={!selectedProductId || qty <= 0} className={`flex-1 py-3 px-4 rounded-xl bg-${themeColor}-600 text-white font-bold text-sm shadow-lg shadow-${themeColor}-200 disabled:opacity-50`}>{t('save')}</button></div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StockManager;

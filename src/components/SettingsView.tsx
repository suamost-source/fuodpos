
import React, { useState, useRef, useEffect } from 'react';
import { ShopSettings, TaxRateConfig, PaymentMethodConfig, Coupon, User, AddonGroup, AddonOption, Category } from '../types';
import { loadUsers, saveUsers, createBackup, restoreBackup, clearAllLocalData } from '../services/storageService';
import { performDatabaseSync } from '../services/syncService';
import { printReceipt } from '../services/printerService';
import { getTranslation } from '../utils/translations';
// Added missing MessageSquare import from lucide-react
import { Save, Building2, Wallet, Percent, Phone, MapPin, Mail, Check, Plus, Trash2, Image as ImageIcon, X, Palette, Ticket, Hash, Users, Shield, User as UserIcon, KeyRound, Database, Download, Upload, MonitorSmartphone, Server, Cloud, RefreshCw, Play, DownloadCloud, ShieldCheck, Eye, HelpCircle, Link, Moon, Sun, Layers, GripVertical, LockKeyhole, Store, Settings as SettingsIcon, Printer, Award, Gift, Smartphone, Send, Code, Target, AlertCircle, Coins, Calculator, Maximize2, Minimize2, LayoutGrid, QrCode, Share2, Bomb, RotateCcw, UserCheck, Calendar, EyeOff, PackageSearch, Tablet, ExternalLink, ChevronDown, ListTree, Monitor, ChevronRight, CreditCard, Banknote, Globe, Type, Flame, HardDrive, Trash, Info, Sparkles, EyeOff as EyeOffIcon, MessageSquare } from 'lucide-react';

declare var QRious: any;

const THEME_COLORS = [
  { name: 'Blue', value: 'blue', class: 'bg-blue-600' },
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-600' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-600' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-600' },
  { name: 'Red', value: 'red', class: 'bg-red-600' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-600' },
  { name: 'Green', value: 'green', class: 'bg-green-600' },
  { name: 'Teal', value: 'teal', class: 'bg-teal-600' },
  { name: 'Slate', value: 'slate', class: 'bg-slate-600' },
];

interface SettingsViewProps {
  settings: ShopSettings;
  onSave: (settings: ShopSettings) => void;
  currentUser?: User;
}

interface StyleConfig {
  themeColor: string;
  inputBackground: string;
  textColor: string;
  borderColor: string;
  labelColor: string;
  mutedText: string;
  inputBorder: string;
  inputPadding: string;
  labelMargin: string;
  cardBg: string;
}

const SettingsSection = ({ title, icon: Icon, children, styles, fullWidth = false }: { title: string, icon: any, children?: React.ReactNode, styles: StyleConfig, fullWidth?: boolean }) => (
  <div className={`${styles.cardBg} p-6 rounded-xl border ${styles.borderColor} shadow-sm mb-6`}>
    <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${styles.borderColor}`}>
      <Icon className={`w-5 h-5 text-${styles.themeColor}-600`} />
      <h3 className={`font-bold ${styles.textColor}`}>{title}</h3>
    </div>
    <div className={`grid grid-cols-1 ${fullWidth ? '' : 'md:grid-cols-2'} gap-6`}>
      {children}
    </div>
  </div>
);

const SettingsInput = ({ label, value, onChange, type = "text", icon: Icon, placeholder, helpText, styles, disabled = false }: any) => {
  return (
    <div>
      <label className={`block text-sm font-medium ${styles.labelColor} ${styles.labelMargin}`}>{label}</label>
      <div className="relative">
        {Icon && <Icon className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${styles.mutedText} w-4 h-4`} />}
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-4 ${styles.inputPadding} border ${styles.inputBorder} rounded-lg focus:ring-2 focus:ring-${styles.themeColor}-500 outline-none transition-all ${styles.inputBackground} ${styles.textColor} disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      </div>
      {helpText && <p className={`text-[10px] ${styles.mutedText} mt-1`}>{helpText}</p>}
    </div>
  );
};

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'system' | 'sync'>('shop');
  const [formData, setFormData] = useState<ShopSettings>(settings);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrTableNumber, setQrTableNumber] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const categoryImageInputRef = useRef<HTMLInputElement>(null);
  const brandingInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForCategoryId, setUploadingForCategoryId] = useState<string | null>(null);
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);
  const [brandingTarget, setBrandingTarget] = useState<'logo' | 'background' | null>(null);

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
      setUsers(loadUsers());
  }, []);

  const { themeColor, inputBackground, inputDensity, textColor, backgroundColor, productIconSize = 'normal', layoutMode = 'desktop' } = formData.appearance;
  const t = (key: any) => getTranslation(formData.language, key);

  const isDark = backgroundColor?.includes('900') || backgroundColor?.includes('800');
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-100';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBorder = isDark ? 'border-gray-600' : 'border-gray-200';
  
  const inputPadding = inputDensity === 'compact' ? 'py-1.5' : 'py-2';
  const labelMargin = inputDensity === 'compact' ? 'mb-1' : 'mb-2';

  const styleConfig: StyleConfig = {
      themeColor,
      inputBackground,
      textColor,
      borderColor,
      labelColor,
      mutedText,
      inputBorder,
      inputPadding,
      labelMargin,
      cardBg
  };
  
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isQrModalOpen && qrCanvasRef.current) {
        let baseUrl = window.location.origin + window.location.pathname;
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        let kioskUrl = `${baseUrl}?mode=kiosk`;
        if (qrTableNumber) kioskUrl += `&table=${encodeURIComponent(qrTableNumber)}`;
        new QRious({
            element: qrCanvasRef.current,
            value: kioskUrl,
            size: 250,
            level: 'H',
            foreground: '#000000',
            background: '#ffffff'
        });
    }
  }, [isQrModalOpen, qrTableNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    if (isAdmin) saveUsers(users); 
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleThemeChange = (mode: 'light' | 'dark') => {
    setFormData({
      ...formData,
      appearance: {
        ...formData.appearance,
        backgroundColor: mode === 'light' ? 'bg-gray-100' : 'bg-gray-900',
        textColor: mode === 'light' ? 'text-gray-800' : 'text-gray-100',
        inputBackground: mode === 'light' ? 'bg-white' : 'bg-gray-800',
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'payment' | 'loginLogo' | 'loginBg' | 'receiptLogo' | 'category' | 'branding') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let maxSize = (type === 'loginBg' || (type === 'branding' && brandingTarget === 'background')) ? 1200 : 400;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
        else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
        canvas.width = width; canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        const optimizedImage = canvas.toDataURL('image/jpeg', 0.8);
        
        if (type === 'category' && uploadingForCategoryId) {
            setFormData(prev => ({
                ...prev,
                categories: prev.categories.map(c => c.id === uploadingForCategoryId ? { ...c, image: optimizedImage } : c)
            }));
            setUploadingForCategoryId(null);
        } else if (type === 'payment' && uploadingForId) {
            setFormData(prev => ({ ...prev, paymentMethods: prev.paymentMethods.map(pm => pm.id === uploadingForId ? { ...pm, image: optimizedImage } : pm) }));
            setUploadingForId(null);
        } else if (type === 'branding') {
            if (brandingTarget === 'logo') setFormData(prev => ({...prev, loginScreen: { ...prev.loginScreen, customLogo: optimizedImage }}));
            else if (brandingTarget === 'background') setFormData(prev => ({...prev, loginScreen: { ...prev.loginScreen, backgroundImage: optimizedImage }}));
            setBrandingTarget(null);
        } else if (type === 'loginLogo') setFormData(prev => ({...prev, loginScreen: { ...prev.loginScreen, customLogo: optimizedImage }}));
        else if (type === 'loginBg') setFormData(prev => ({...prev, loginScreen: { ...prev.loginScreen, backgroundImage: optimizedImage }}));
        else if (type === 'receiptLogo') setFormData(prev => ({...prev, receipt: { ...prev.receipt, logo: optimizedImage }}));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleBackupDownload = () => {
      const backupString = createBackup();
      const blob = new Blob([backupString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fuodpos_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
  };

  const handleBackupRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (confirm("This will overwrite all current data. Are you sure?")) {
              const success = restoreBackup(content);
              if (success) { alert("System Restored Successfully. The app will reload."); window.location.reload(); } 
              else { alert("Restore Failed. The file might be corrupted or incompatible."); }
          }
      };
      reader.readAsText(file);
  };

  const handleResetOrders = () => {
      if (confirm("Reset order counter to 1?")) {
          setFormData({ ...formData, nextOrderNumber: 1 });
      }
  };

  const handleClearCache = () => {
      if (confirm("DANGER: This will delete ALL local data (products, members, sales) and reset to defaults. Are you absolutely sure?")) {
          clearAllLocalData();
          window.location.reload();
      }
  };

  const addUser = () => setUsers([...users, { id: Date.now().toString(), name: 'Staff Member', username: `user${users.length + 1}`, password: 'password', role: 'cashier' }]);
  const updateUser = (id: string, field: keyof User, value: any) => setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
  const removeUser = (id: string) => { if (users.length <= 1) return; setUsers(users.filter(u => u.id !== id)); };

  return (
    <div className={`h-full ${backgroundColor} overflow-hidden flex flex-col`}>
      <div className={`border-b ${borderColor} ${cardBg} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm z-10`}>
          <div className="flex items-center gap-3">
              <SettingsIcon className={`w-8 h-8 text-${themeColor}-600`} />
              <h2 className={`text-2xl font-black ${textColor}`}>Settings</h2>
          </div>
          <div className="flex bg-gray-200/50 p-1.5 rounded-2xl border border-gray-200/20 gap-1 overflow-x-auto scrollbar-hide max-w-full">
              <button onClick={() => setActiveTab('shop')} className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'shop' ? `bg-${themeColor}-600 text-white shadow-lg` : `${mutedText} hover:bg-white/10`}`}><Store className="w-4 h-4" />Shop Options</button>
              <button onClick={() => setActiveTab('system')} className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'system' ? `bg-${themeColor}-600 text-white shadow-lg` : `${mutedText} hover:bg-white/10`}`}><MonitorSmartphone className="w-4 h-4" />System Config</button>
              <button onClick={() => setActiveTab('sync')} className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'sync' ? `bg-${themeColor}-600 text-white shadow-lg` : `${mutedText} hover:bg-white/10`}`}><RefreshCw className="w-4 h-4" />Sync & Backup</button>
          </div>
          <button onClick={handleSubmit} className={`flex-shrink-0 flex items-center gap-2 bg-${themeColor}-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-${themeColor}-200 hover:bg-opacity-90 active:scale-95 transition-all text-xs uppercase tracking-widest`}>{showSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} {showSuccess ? 'Saved' : 'Save All Changes'}</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto pb-20">
          {activeTab === 'shop' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <SettingsSection title={t('generalInfo')} icon={Building2} styles={styleConfig}>
                      <SettingsInput label={t('shopName')} value={formData.shopName} onChange={(e: any) => setFormData({...formData, shopName: e.target.value})} styles={styleConfig} />
                      <SettingsInput label={t('contactNumber')} value={formData.contact} onChange={(e: any) => setFormData({...formData, contact: e.target.value})} icon={Phone} styles={styleConfig} />
                      <SettingsInput label={t('emailAddress')} value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} icon={Mail} styles={styleConfig} placeholder="hello@shop.com" />
                      <SettingsInput label={t('address')} value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} icon={MapPin} styles={styleConfig} placeholder="123 Main St, City" />
                  </SettingsSection>

                  <SettingsSection title="Digital Menu & Kiosk" icon={Tablet} styles={styleConfig}>
                      <div className="md:col-span-2 space-y-4">
                          <SettingsInput 
                              label="Landing Welcome Message" 
                              value={formData.kiosk.welcomeMessage} 
                              onChange={(e: any) => setFormData({...formData, kiosk: {...formData.kiosk, welcomeMessage: e.target.value}})} 
                              icon={Sparkles} 
                              styles={styleConfig} 
                              placeholder="e.g. Welcome to Our Store" 
                          />
                          <SettingsInput 
                              label="Marketing Tagline" 
                              value={formData.kiosk.tagline} 
                              onChange={(e: any) => setFormData({...formData, kiosk: {...formData.kiosk, tagline: e.target.value}})} 
                              icon={MessageSquare} 
                              styles={styleConfig} 
                              placeholder="e.g. Premium flavors crafted for you." 
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.kiosk.showTagline ? `bg-${themeColor}-600` : 'bg-gray-300'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.kiosk.showTagline ? 'translate-x-5' : 'translate-x-0.5'}`} /></div>
                                <input type="checkbox" className="hidden" checked={formData.kiosk.showTagline} onChange={(e) => setFormData({...formData, kiosk: {...formData.kiosk, showTagline: e.target.checked}})} />
                                <span className={`font-bold text-xs ${textColor}`}>Show Tagline on Start</span>
                            </label>
                            
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.hideOutOfStock ? `bg-${themeColor}-600` : 'bg-gray-300'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.hideOutOfStock ? 'translate-x-5' : 'translate-x-0.5'}`} /></div>
                                <input type="checkbox" className="hidden" checked={formData.hideOutOfStock} onChange={(e) => setFormData({...formData, hideOutOfStock: e.target.checked})} />
                                <span className={`font-bold text-xs ${textColor}`}>Hide Sold-Out Items</span>
                            </label>
                          </div>

                          <div className={`mt-4 p-5 rounded-2xl border-2 border-dashed ${borderColor} ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} flex flex-col sm:flex-row items-center justify-between gap-4`}>
                              <div className="flex items-center gap-3">
                                  <div className={`p-2.5 bg-${themeColor}-100 rounded-xl text-${themeColor}-600`}><QrCode className="w-5 h-5" /></div>
                                  <div className="text-left">
                                      <h4 className="font-bold text-sm">Table Ordering QR</h4>
                                      <p className="text-[10px] text-gray-500">Generate scan-to-order codes for tables</p>
                                  </div>
                              </div>
                              <button type="button" onClick={() => setIsQrModalOpen(true)} className={`px-5 py-2 bg-${themeColor}-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all`}>Open Generator</button>
                          </div>
                      </div>
                  </SettingsSection>

                  <SettingsSection title="Storefront Branding" icon={LayoutGrid} styles={styleConfig}>
                      <div className="space-y-4">
                          <label className={`block text-xs font-black uppercase tracking-widest ${mutedText}`}>Store Logo</label>
                          <div className={`aspect-video rounded-2xl border-2 border-dashed ${borderColor} flex items-center justify-center relative overflow-hidden group cursor-pointer`} onClick={() => { setBrandingTarget('logo'); brandingInputRef.current?.click(); }}>
                              {formData.loginScreen.customLogo ? (
                                  <img src={formData.loginScreen.customLogo} className="w-full h-full object-contain p-4" />
                              ) : (
                                  <ImageIcon className="w-8 h-8 opacity-20" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">Change Logo</div>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <label className={`block text-xs font-black uppercase tracking-widest ${mutedText}`}>Kiosk/Login Background</label>
                          <div className={`aspect-video rounded-2xl border-2 border-dashed ${borderColor} flex items-center justify-center relative overflow-hidden group cursor-pointer`} onClick={() => { setBrandingTarget('background'); brandingInputRef.current?.click(); }}>
                              {formData.loginScreen.backgroundImage ? (
                                  <img src={formData.loginScreen.backgroundImage} className="w-full h-full object-cover" />
                              ) : (
                                  <Monitor className="w-8 h-8 opacity-20" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">Change Background</div>
                          </div>
                      </div>
                      <input type="file" ref={brandingInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'branding')} />
                  </SettingsSection>

                  <SettingsSection title="Localization & Sequencing" icon={Globe} styles={styleConfig}>
                      <div>
                          <label className={`block text-sm font-medium ${labelColor} ${labelMargin}`}>{t('language')}</label>
                          <div className="relative">
                              <Globe className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${mutedText} w-4 h-4`} />
                              <select className={`w-full pl-9 pr-4 ${inputPadding} border ${inputBorder} rounded-lg focus:ring-2 focus:ring-${themeColor}-500 outline-none transition-all ${inputBackground} ${textColor} appearance-none cursor-pointer`} value={formData.language} onChange={(e) => setFormData({...formData, language: e.target.value as any})}><option value="en">English</option><option value="zh">中文 (Chinese)</option><option value="ms">Bahasa Melayu</option></select>
                              <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${mutedText} w-4 h-4 pointer-events-none`} />
                          </div>
                      </div>
                      <SettingsInput label={t('currencySymbol')} value={formData.currency} onChange={(e: any) => setFormData({...formData, currency: e.target.value})} icon={Coins} styles={styleConfig} placeholder="$" />
                      <SettingsInput label={t('orderPrefix')} value={formData.orderPrefix} onChange={(e: any) => setFormData({...formData, orderPrefix: e.target.value})} icon={Hash} styles={styleConfig} placeholder="ORD-" />
                      <SettingsInput label={t('nextOrderNumber')} value={formData.nextOrderNumber} onChange={(e: any) => setFormData({...formData, nextOrderNumber: parseInt(e.target.value) || 1})} type="number" icon={Maximize2} styles={styleConfig} />
                  </SettingsSection>

                  <SettingsSection title={t('loyalty')} icon={Award} styles={styleConfig}>
                      <div className="md:col-span-2">
                          <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.membership.enabled ? `bg-${themeColor}-600` : 'bg-gray-300'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.membership.enabled ? 'translate-x-7' : 'translate-x-1'}`} /></div>
                              <input type="checkbox" className="hidden" checked={formData.membership.enabled} onChange={(e) => setFormData({...formData, membership: {...formData.membership, enabled: e.target.checked}})} />
                              <span className={`font-black uppercase tracking-widest text-xs ${textColor}`}>{t('enablePoints')}</span>
                          </label>
                      </div>
                      {formData.membership.enabled && (
                          <>
                              <SettingsInput label={t('earnRate')} value={formData.membership.earnRate} onChange={(e: any) => setFormData({...formData, membership: {...formData.membership, earnRate: parseFloat(e.target.value) || 0}})} type="number" icon={Coins} helpText={t('earnRateHelp')} styles={styleConfig} />
                              <SettingsInput label={t('redeemRate')} value={formData.membership.earnRate} onChange={(e: any) => setFormData({...formData, membership: {...formData.membership, redeemRate: parseFloat(e.target.value) || 0}})} type="number" icon={Gift} helpText={t('redeemRateHelp')} styles={styleConfig} />
                              <SettingsInput label={t('minRedeemPoints')} value={formData.membership.minRedeemPoints || 0} onChange={(e: any) => setFormData({...formData, membership: {...formData.membership, minRedeemPoints: parseInt(e.target.value) || 0}})} type="number" icon={Target} helpText={t('minRedeemPointsHelp')} styles={styleConfig} />
                              <SettingsInput label={t('maxDiscountPercentageByPoints')} value={formData.membership.maxDiscountPercentageByPoints || 100} onChange={(e: any) => setFormData({...formData, membership: {...formData.membership, maxDiscountPercentageByPoints: parseInt(e.target.value) || 0}})} type="number" icon={Percent} helpText={t('maxDiscountPercentageByPointsHelp')} styles={styleConfig} />
                          </>
                      )}
                  </SettingsSection>
              </div>
          )}

          {activeTab === 'system' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <SettingsSection title={t('appearance')} icon={Palette} styles={styleConfig}>
                      <div className="md:col-span-2">
                        <label className={`block text-sm font-medium ${labelColor} mb-3`}>{t('themeColor')}</label>
                        <div className="grid grid-cols-5 sm:grid-cols-9 gap-3">
                          {THEME_COLORS.map(c => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, appearance: { ...formData.appearance, themeColor: c.value } })}
                              className={`w-full aspect-square rounded-xl ${c.class} border-4 transition-all flex items-center justify-center ${themeColor === c.value ? 'border-gray-900 shadow-lg scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                              title={c.name}
                            >
                              {themeColor === c.value && <Check className="text-white w-5 h-5" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-2 gap-4 mt-2">
                        <button
                          type="button"
                          onClick={() => handleThemeChange('light')}
                          className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${!isDark ? `border-${themeColor}-600 bg-${themeColor}-50` : 'border-gray-200 opacity-60'}`}
                        >
                          <Sun className={`w-5 h-5 ${!isDark ? `text-${themeColor}-600` : ''}`} />
                          <span className="font-bold">{t('light')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleThemeChange('dark')}
                          className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${isDark ? `border-${themeColor}-600 bg-gray-800` : 'border-gray-200 opacity-60'}`}
                        >
                          <Moon className={`w-5 h-5 ${isDark ? `text-${themeColor}-400` : ''}`} />
                          <span className="font-bold">{t('dark')}</span>
                        </button>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium ${labelColor} ${labelMargin}`}>{t('inputDensity')}</label>
                        <select
                          className={`w-full p-2 border ${inputBorder} rounded-lg ${inputBackground} ${textColor} outline-none focus:ring-2 focus:ring-${themeColor}-500`}
                          value={formData.appearance.inputDensity}
                          onChange={(e) => setFormData({ ...formData, appearance: { ...formData.appearance, inputDensity: e.target.value as any } })}
                        >
                          <option value="comfortable">{t('comfortable')}</option>
                          <option value="compact">{t('compact')}</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium ${labelColor} ${labelMargin}`}>{t('fontSize')}</label>
                        <select
                          className={`w-full p-2 border ${inputBorder} rounded-lg ${inputBackground} ${textColor} outline-none focus:ring-2 focus:ring-${themeColor}-500`}
                          value={formData.appearance.fontSize}
                          onChange={(e) => setFormData({ ...formData, appearance: { ...formData.appearance, fontSize: e.target.value as any } })}
                        >
                          <option value="text-sm">Small</option>
                          <option value="text-base">Medium</option>
                          <option value="text-lg">Large</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium ${labelColor} ${labelMargin}`}>Layout Optimization</label>
                        <div className="relative">
                            <Monitor className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${mutedText} w-4 h-4`} />
                            <select
                                className={`w-full pl-9 pr-4 py-2 border ${inputBorder} rounded-lg ${inputBackground} ${textColor} outline-none focus:ring-2 focus:ring-${themeColor}-500 appearance-none`}
                                value={formData.appearance.layoutMode || 'desktop'}
                                onChange={(e) => setFormData({ ...formData, appearance: { ...formData.appearance, layoutMode: e.target.value as any } })}
                            >
                                <option value="desktop">Desktop / Large Display</option>
                                <option value="tablet">Tablet / Medium Display</option>
                                <option value="mobile">Mobile / Compact Display</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium ${labelColor} ${labelMargin}`}>Product Grid Scaling</label>
                        <div className="relative">
                            <LayoutGrid className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${mutedText} w-4 h-4`} />
                            <select
                                className={`w-full pl-9 pr-4 py-2 border ${inputBorder} rounded-lg ${inputBackground} ${textColor} outline-none focus:ring-2 focus:ring-${themeColor}-500 appearance-none`}
                                value={formData.appearance.productIconSize || 'normal'}
                                onChange={(e) => setFormData({ ...formData, appearance: { ...formData.appearance, productIconSize: e.target.value as any } })}
                            >
                                <option value="normal">Standard (Small)</option>
                                <option value="large">Card (Medium)</option>
                                <option value="enlarge">Ultra (Large)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                  </SettingsSection>

                  <SettingsSection title="Maintenance & Utilities" icon={HardDrive} styles={styleConfig} fullWidth>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className={`p-5 rounded-2xl border ${borderColor} ${isDark ? 'bg-gray-800' : 'bg-gray-50'} flex flex-col`}>
                              <div className="flex items-center gap-3 mb-3">
                                  <RotateCcw className="w-5 h-5 text-blue-500" />
                                  <h4 className="font-bold text-sm">Sequence Control</h4>
                              </div>
                              <p className="text-xs text-gray-500 mb-4 flex-1">Reset the current order number back to 1. Usually done at the start of a business day.</p>
                              <button type="button" onClick={handleResetOrders} className={`w-full py-2.5 px-4 bg-white border ${borderColor} rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all`}>Reset Order #</button>
                          </div>

                          <div className={`p-5 rounded-2xl border ${borderColor} ${isDark ? 'bg-gray-800' : 'bg-gray-50'} flex flex-col`}>
                              <div className="flex items-center gap-3 mb-3">
                                  <Trash className="w-5 h-5 text-red-500" />
                                  <h4 className="font-bold text-sm">System Purge</h4>
                              </div>
                              <p className="text-xs text-gray-500 mb-4 flex-1">Factory reset. This will wipe the browser storage clean. Use only for troubleshooting.</p>
                              <button type="button" onClick={handleClearCache} className={`w-full py-2.5 px-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all`}>Purge All Data</button>
                          </div>

                          <div className={`p-5 rounded-2xl border ${borderColor} ${isDark ? 'bg-gray-800' : 'bg-gray-50'} flex flex-col`}>
                              <div className="flex items-center gap-3 mb-3">
                                  <Info className="w-5 h-5 text-indigo-500" />
                                  <h4 className="font-bold text-sm">System Info</h4>
                              </div>
                              <div className="space-y-2 mb-4 flex-1">
                                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase"><span>Version</span><span className={textColor}>3.2.0</span></div>
                                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase"><span>Platform</span><span className={textColor}>Web / PWA</span></div>
                                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase"><span>Storage</span><span className={textColor}>Encrypted Local</span></div>
                              </div>
                              <div className="text-[9px] text-gray-400 italic">FuodPOS Malaysia - Robust Offline Architecture</div>
                          </div>
                      </div>
                  </SettingsSection>

                  <SettingsSection title={t('userAccounts')} icon={Users} styles={styleConfig} fullWidth>
                      <div className="space-y-4">
                          {users.map((u) => (
                              <div key={u.id} className={`${cardBg} p-4 rounded-2xl border ${borderColor} flex flex-col md:flex-row items-center justify-between gap-4 group`}>
                                  <div className="flex items-center gap-4 flex-1 w-full">
                                      <div className={`w-10 h-10 rounded-xl bg-${themeColor}-100 flex items-center justify-center text-${themeColor}-600`}><UserIcon className="w-5 h-5" /></div>
                                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <input type="text" className={`bg-transparent border-none outline-none font-bold text-sm ${textColor} w-full focus:ring-0`} value={u.name} onChange={(e) => updateUser(u.id, 'name', e.target.value)} placeholder="Full Name" />
                                          <div className="flex items-center gap-2">
                                              <UserCheck className="w-3 h-3 text-gray-400" />
                                              <input type="text" className={`bg-transparent border-none outline-none text-xs font-bold text-gray-500 w-full focus:ring-0`} value={u.username} onChange={(e) => updateUser(u.id, 'username', e.target.value)} placeholder="username" />
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4 w-full md:w-auto">
                                      <select className={`p-1.5 border ${inputBorder} rounded-lg text-xs font-bold ${inputBackground} ${textColor} outline-none`} value={u.role} onChange={(e) => updateUser(u.id, 'role', e.target.value)}>
                                          <option value="cashier">Cashier</option>
                                          <option value="manager">Manager</option>
                                          <option value="admin">Admin</option>
                                      </select>
                                      <button type="button" onClick={() => removeUser(u.id)} disabled={users.length <= 1} className="p-2 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-0"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                              </div>
                          ))}
                          <button type="button" onClick={addUser} className={`text-[10px] font-black uppercase text-${themeColor}-600 hover:opacity-70 flex items-center gap-1`}><Plus className="w-3 h-3" /> Create Account</button>
                      </div>
                  </SettingsSection>
              </div>
          )}

          {activeTab === 'sync' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <SettingsSection title="Cloud Sync Configuration" icon={Database} styles={styleConfig}>
                      <div className="md:col-span-2 mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 text-sm">
                          <p>To sync across devices (like Mobile and PC), enable sync and select <b>Firebase Mode</b>. Firebase Singapore servers provide the best performance for Malaysia.</p>
                      </div>
                      <div className="md:col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className={`w-5 h-5 rounded text-${themeColor}-600`} checked={formData.databaseSync?.enabled} onChange={(e) => setFormData({...formData, databaseSync: {...(formData.databaseSync as any), enabled: e.target.checked }})} />
                              <span className={`font-bold ${textColor}`}>{t('enableSync')}</span>
                          </label>
                      </div>
                      {formData.databaseSync?.enabled && (
                          <>
                              <div>
                                  <label className={`block text-sm font-medium ${labelColor} mb-2`}>Sync Provider</label>
                                  <div className="flex flex-wrap gap-2">
                                      <button type="button" onClick={() => setFormData({...formData, databaseSync: {...(formData.databaseSync as any), syncMode: 'firebase'}})} className={`flex-1 p-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${formData.databaseSync.syncMode === 'firebase' ? `border-orange-500 bg-orange-50 text-orange-700` : 'border-gray-200 opacity-60'}`}><Flame className="w-4 h-4" /> Firebase</button>
                                      <button type="button" onClick={() => setFormData({...formData, databaseSync: {...(formData.databaseSync as any), syncMode: 'cloud'}})} className={`flex-1 p-2 rounded-lg border-2 transition-all ${formData.databaseSync.syncMode === 'cloud' ? `border-${themeColor}-600 bg-${themeColor}-50` : 'border-gray-200 opacity-60'}`}>REST API</button>
                                  </div>
                              </div>
                              <SettingsInput label={t('terminalId')} value={formData.databaseSync.terminalId} onChange={(e: any) => setFormData({...formData, databaseSync: {...(formData.databaseSync as any), terminalId: e.target.value}})} styles={styleConfig} />
                              
                              {formData.databaseSync.syncMode === 'firebase' && (
                                  <div className="md:col-span-2 p-4 bg-orange-50/50 border border-orange-100 rounded-xl space-y-4">
                                      <h4 className="text-orange-800 font-bold text-sm flex items-center gap-2"><Flame className="w-4 h-4" /> Firebase Firestore Settings</h4>
                                      <SettingsInput label="Firebase Project ID" value={formData.databaseSync.firebaseProjectId} onChange={(e: any) => setFormData({...formData, databaseSync: {...(formData.databaseSync as any), firebaseProjectId: e.target.value}})} styles={styleConfig} placeholder="your-project-id" />
                                      <p className="text-[10px] text-orange-600 italic leading-tight">Note: Go to Firebase Console > Firestore > Rules and ensure "allow read, write: if true;" for testing. In production, secure your rules.</p>
                                  </div>
                              )}
                          </>
                      )}
                  </SettingsSection>

                  <SettingsSection title={t('secureData')} icon={Shield} styles={styleConfig}>
                      <div className="md:col-span-2 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                                  <h4 className="font-bold mb-2 flex items-center gap-2"><Download className="w-4 h-4" /> {t('fullBackup')}</h4>
                                  <p className="text-xs text-gray-500 mb-4">Export all your settings, products, and transactions to an encrypted JSON file.</p>
                                  <button type="button" onClick={handleBackupDownload} className="w-full py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-black transition-all">{t('downloadBackup')}</button>
                              </div>
                              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                                  <h4 className="font-bold mb-2 flex items-center gap-2"><Upload className="w-4 h-4" /> Restore Data</h4>
                                  <p className="text-xs text-gray-500 mb-4">Overwrite current system data with a previously saved backup file.</p>
                                  <button type="button" onClick={() => backupInputRef.current?.click()} className="w-full py-2 border-2 border-gray-800 text-gray-800 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all">Restore File</button>
                                  <input type="file" ref={backupInputRef} className="hidden" accept=".json" onChange={handleBackupRestore} />
                              </div>
                          </div>
                      </div>
                  </SettingsSection>
              </div>
          )}
          
          <input type="file" ref={categoryImageInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'category')} />
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, uploadingForId as any)} />
        </form>
      </div>

      {isQrModalOpen && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
              <div className={`${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white'} rounded-[40px] shadow-2xl w-full max-lg overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-300`}>
                  <div className={`w-full bg-${themeColor}-600 p-8 text-center text-white relative`}>
                      <button onClick={() => setIsQrModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                      <QrCode className="w-12 h-12 mx-auto mb-4 opacity-80" />
                      <h3 className="text-3xl font-black">{formData.shopName}</h3>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-80 mt-1">Digital Menu QR Code</p>
                  </div>
                  <div className="p-10 flex flex-col items-center w-full">
                      <div className="w-full max-w-xs mb-6">
                        <label className={`block text-xs font-black uppercase tracking-widest ${mutedText} mb-2 text-center`}>Table / Location Code</label>
                        <input type="text" placeholder="e.g. Table 05" className={`w-full p-4 rounded-xl border-2 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-800'} text-center font-bold text-lg focus:border-${themeColor}-500 outline-none transition-all shadow-inner`} value={qrTableNumber} onChange={(e) => setQrTableNumber(e.target.value)} />
                      </div>
                      <div className="p-6 bg-white rounded-[32px] border-4 border-gray-100 shadow-inner mb-8">
                          <canvas ref={qrCanvasRef} />
                      </div>
                      <div className="flex gap-3 w-full">
                          <button type="button" onClick={() => { const canvas = qrCanvasRef.current; if (canvas) { const link = document.createElement('a'); link.download = `qr_kiosk_${qrTableNumber || 'general'}.png`; link.href = canvas.toDataURL(); link.click(); } }} className={`flex-1 py-4 ${isDark ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-800 border-transparent'} border rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-80 transition-colors`}><Download className="w-5 h-5" /> Download</button>
                          <button type="button" onClick={() => {
                                const canvas = qrCanvasRef.current;
                                if (!canvas) return;
                                const win = window.open('', '_blank');
                                if (!win) return;
                                win.document.write(`<html><body style="display:flex;flex-direction:column;align-items:center;justify-center;font-family:sans-serif;text-align:center;padding:50px;"><h1 style="margin-bottom:10px;">${formData.shopName}</h1><h2 style="color:#666;margin-bottom:30px;">Digital Menu - ${qrTableNumber || 'Scan to Order'}</h2><img src="${canvas.toDataURL()}" style="width:300px;height:300px;border:1px solid #eee;padding:10px;border-radius:20px;"/><script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script></body></html>`);
                            }} className={`flex-1 py-4 bg-${themeColor}-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-${themeColor}-200/20 transition-all`}><Printer className="w-5 h-5" /> Print</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SettingsView;

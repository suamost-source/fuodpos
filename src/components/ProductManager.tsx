import React, { useState, useRef } from 'react';
import { Product, ShopSettings, AddonGroup, AddonOption, Category, StockPurchase } from '../types';
import { Plus, X, Edit2, Trash2, Sparkles, Loader2, Upload, Image as ImageIcon, Video, Layers, CheckSquare, List, Download, GitMerge, FileText, Settings, Tag, Award, Coins, Copy, Check, FileVideo, Info, Power, PowerOff, Package, ChevronDown, ChevronRight, Settings2, PlayCircle, FileSpreadsheet, Archive, BarChart3, CheckCircle, Star } from 'lucide-react';
import { generateProductDescription } from '../services/geminiService';
import { getTranslation } from '../utils/translations';
import StockManager from './StockManager';

interface ProductManagerProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  settings?: ShopSettings;
  onSettingsUpdate?: (settings: ShopSettings) => void;
  purchases: StockPurchase[];
  onPurchaseComplete: (purchase: StockPurchase) => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ products, setProducts, settings, onSettingsUpdate, purchases, onPurchaseComplete }) => {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'inventory'>('items');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const productImageRef = useRef<HTMLInputElement>(null);
  const productVideoRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const themeColor = settings?.appearance.themeColor || 'blue';
  const backgroundColor = settings?.appearance.backgroundColor || 'bg-gray-50';
  const currency = settings?.currency || '$';
  const sp = '\u00A0';
  const isDark = backgroundColor.includes('900') || backgroundColor.includes('800');
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const modalBg = isDark ? 'bg-gray-900' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-100';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-800';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';

  const t = (key: any) => getTranslation(settings?.language, key);
  const availableCategories: Category[] = settings?.categories || [];

  const [formData, setFormData] = useState<Partial<Product>>({ 
      name: '', price: 0, category: 'Other', color: `bg-${themeColor}-500`, 
      description: '', trackInventory: true, stock: 0, minStock: 0, isAvailable: true, 
      addons: [], pointsPrice: 0, pointsAwarded: 0, video: '', isChefSpecial: false
  });

  const handleOpen = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({ 
          ...product, 
          trackInventory: product.trackInventory ?? true, 
          isAvailable: product.isAvailable ?? true,
          isChefSpecial: product.isChefSpecial ?? false,
          addons: product.addons || []
      });
    } else {
      setEditingId(null);
      setFormData({ 
          name: '', price: 0, category: 'Other', color: `bg-${themeColor}-500`, 
          trackInventory: true, stock: 0, minStock: 0, isAvailable: true, 
          isChefSpecial: false,
          addons: [], description: '', pointsPrice: 0, pointsAwarded: 0, video: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;
    const finalProduct = { ...formData as Product, id: editingId || Date.now().toString() };
    if (editingId) { 
        setProducts(products.map(p => p.id === editingId ? finalProduct : p)); 
    } else { 
        setProducts([...products, finalProduct]); 
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => { if (confirm(t('delete') + '?')) setProducts(products.filter(p => p.id !== id)); };

  const handleExportCSV = () => {
      const headers = ["Name", "Price", "Category", "Description", "TrackInventory", "Stock", "MinStock", "IsAvailable", "IsChefSpecial", "Color", "Barcode"];
      const rows = products.map(p => [
          `"${p.name.replace(/"/g, '""')}"`,
          p.price,
          `"${p.category}"`,
          `"${(p.description || '').replace(/"/g, '""')}"`,
          p.trackInventory ? "TRUE" : "FALSE",
          p.stock || 0,
          p.minStock || 0,
          (p.isAvailable !== false) ? "TRUE" : "FALSE",
          p.isChefSpecial ? "TRUE" : "FALSE",
          `"${p.color || ''}"`,
          `"${p.barcode || ''}"`
      ].join(','));
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          const lines = content.split('\n');
          const imported: Product[] = [];
          
          for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(c => c.replace(/^"|"$/g, '')) || line.split(',');
              
              const [name, price, category, description, trackInventory, stock, minStock, isAvailable, isChefSpecial, color, barcode] = cols;
              
              if (name && !isNaN(parseFloat(price))) {
                  imported.push({
                      id: `imp-${Date.now()}-${i}`,
                      name: name.trim(),
                      price: parseFloat(price),
                      category: category?.trim() || 'Other',
                      description: description?.trim() || '',
                      trackInventory: trackInventory?.toUpperCase() === 'TRUE',
                      stock: parseInt(stock) || 0,
                      minStock: parseInt(minStock) || 0,
                      isAvailable: isAvailable?.toUpperCase() !== 'FALSE',
                      isChefSpecial: isChefSpecial?.toUpperCase() === 'TRUE',
                      color: color?.trim() || `bg-${themeColor}-500`,
                      barcode: barcode?.trim() || '',
                      addons: [],
                      isSynced: false,
                      lastUpdated: Date.now()
                  });
              }
          }
          
          if (imported.length > 0) {
              setProducts([...products, ...imported]);
              alert(`Successfully imported ${imported.length} products.`);
          } else {
              alert("No valid product data found in the CSV.");
          }
      };
      reader.readAsText(file);
      if (importInputRef.current) importInputRef.current.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image(); img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        canvas.width = 400; canvas.height = 400; ctx?.drawImage(img, 0, 0, 400, 400);
        setFormData(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.7) }));
        setIsProcessingImage(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Video file too large. Please use a file under 5MB for offline storage performance.");
      return;
    }
    setIsProcessingVideo(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, video: reader.result as string }));
      setIsProcessingVideo(false);
    };
    reader.readAsDataURL(file);
  };

  const generateAiDescription = async () => {
      if (!formData.name) return;
      setIsGeneratingDescription(true);
      const desc = await generateProductDescription(formData.name, formData.category || 'General');
      setFormData(prev => ({ ...prev, description: desc }));
      setIsGeneratingDescription(false);
  };

  const addAddonGroup = () => {
      const newGroup: AddonGroup = { id: Date.now().toString(), name: 'New Group', required: false, multiple: false, options: [] };
      setFormData(prev => ({ ...prev, addons: [...(prev.addons || []), newGroup] }));
  };

  const loadFromTemplate = (template: AddonGroup) => {
      const newGroup: AddonGroup = { ...template, id: Date.now().toString() };
      setFormData(prev => ({ ...prev, addons: [...(prev.addons || []), newGroup] }));
      setIsTemplateModalOpen(false);
  };

  const updateAddonGroup = (groupId: string, updates: Partial<AddonGroup>) => {
      setFormData(prev => ({
          ...prev,
          addons: prev.addons?.map(g => g.id === groupId ? { ...g, ...updates } : g)
      }));
  };

  const removeAddonGroup = (groupId: string) => {
      setFormData(prev => ({ ...prev, addons: prev.addons?.filter(g => g.id !== groupId) }));
  };

  const addAddonOption = (groupId: string) => {
      const newOption: AddonOption = { id: Date.now().toString(), name: '', price: 0 };
      setFormData(prev => ({
          ...prev,
          addons: prev.addons?.map(g => g.id === groupId ? { ...g, options: [...g.options, newOption] } : g)
      }));
  };

  const updateAddonOption = (groupId: string, optionId: string, updates: Partial<AddonOption>) => {
      setFormData(prev => ({
          ...prev,
          addons: prev.addons?.map(g => g.id === groupId ? { 
              ...g, 
              options: g.options.map(o => o.id === optionId ? { ...o, ...updates } : o) 
          } : g)
      }));
  };

  const removeAddonOption = (groupId: string, optionId: string) => {
      setFormData(prev => ({
          ...prev,
          addons: prev.addons?.map(g => g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g)
      }));
  };

  return (
    <div className={`h-full flex flex-col ${backgroundColor} overflow-hidden`}>
      <div className={`border-b ${borderColor} ${cardBg} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm z-10`}>
          <div className="flex items-center gap-3">
              <Archive className={`w-8 h-8 text-${themeColor}-600`} />
              <h2 className={`text-2xl font-black ${textColor}`}>Catalog & Stock</h2>
          </div>

          <div className="flex bg-gray-200/50 p-1 rounded-2xl border border-gray-200/20 gap-1">
              <button
                  onClick={() => setActiveSubTab('items')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'items' ? `bg-${themeColor}-600 text-white shadow-lg` : `${mutedText} hover:bg-white/10`}`}
              >
                  <List className="w-4 h-4" />
                  Product Items
              </button>
              <button
                  onClick={() => setActiveSubTab('inventory')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'inventory' ? `bg-${themeColor}-600 text-white shadow-lg` : `${mutedText} hover:bg-white/10`}`}
              >
                  <Package className="w-4 h-4" />
                  Inventory & Stock
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto">
          {activeSubTab === 'items' ? (
            <div className="p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className={`w-5 h-5 text-${themeColor}-600`} />
                            <h3 className={`text-xl font-bold ${textColor}`}>Master Catalog</h3>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => importInputRef.current?.click()} className={`flex items-center gap-2 px-5 py-2.5 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-200 text-gray-700'} border rounded-xl hover:opacity-80 transition-all shadow-sm text-sm font-black uppercase tracking-tighter`}>
                                <Upload className="w-4 h-4" /> <span>Import</span>
                            </button>
                            <input type="file" ref={importInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
                            <button onClick={handleExportCSV} className={`flex items-center gap-2 px-5 py-2.5 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-200 text-gray-700'} border rounded-xl hover:opacity-80 transition-all shadow-sm text-sm font-black uppercase tracking-tighter`}>
                                <Download className="w-4 h-4" /> <span>Export</span>
                            </button>
                            <button onClick={() => handleOpen()} className={`bg-${themeColor}-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-${themeColor}-200 hover:bg-opacity-90 transition-all flex items-center gap-2 text-sm uppercase tracking-widest`}>
                                <Plus className="w-5 h-5" /> Add Product
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.length === 0 ? (
                            <div className="col-span-full py-20 text-center opacity-30">
                                <Archive className={`w-20 h-20 mx-auto mb-4 text-${themeColor}-600`} />
                                <p className="text-xl font-black uppercase tracking-widest">No Products Found</p>
                            </div>
                        ) : products.map(product => (
                            <div key={product.id} className={`${cardBg} p-5 rounded-[30px] border-2 ${borderColor} shadow-sm group hover:shadow-xl hover:border-${themeColor}-400 transition-all relative overflow-hidden flex flex-col`}>
                                <div className="aspect-square rounded-[25px] overflow-hidden bg-gray-100 mb-5 relative">
                                    {product.image ? (
                                        <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                                    ) : (
                                        <div className={`w-full h-full ${product.color || `bg-${themeColor}-500`} flex items-center justify-center text-white font-black text-4xl`}>
                                            {product.name.charAt(0)}
                                        </div>
                                    )}
                                    {product.video && (
                                        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full text-purple-600 shadow-lg">
                                            <PlayCircle className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 flex gap-1">
                                        <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                                            {product.category}
                                        </div>
                                        {product.isChefSpecial && (
                                            <div className="px-3 py-1 bg-amber-500 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1">
                                                <Star className="w-2.5 h-2.5 fill-white" /> Special
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex-1 space-y-2 mb-6">
                                    <h3 className={`font-black ${textColor} text-lg leading-tight truncate`}>{product.name}</h3>
                                    {product.description ? (
                                        <p className={`text-xs ${mutedText} line-clamp-2 italic leading-relaxed`}>{product.description}</p>
                                    ) : (
                                        <p className={`text-xs ${mutedText} italic opacity-50`}>No description added.</p>
                                    )}
                                </div>

                                <div className={`flex justify-between items-center pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1`}>Price</span>
                                        <span className={`font-black text-2xl text-${themeColor}-600`}>{currency}{sp}{product.price.toFixed(2)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpen(product)} className={`p-3 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'} rounded-2xl hover:bg-${themeColor}-600 hover:text-white transition-all shadow-sm`} title="Edit Product">
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(product.id)} className={`p-3 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'} rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm`} title="Delete Product">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          ) : (
            <StockManager 
                products={products} 
                onProductUpdate={setProducts} 
                purchases={purchases} 
                onPurchaseComplete={onPurchaseComplete} 
                settings={settings!} 
            />
          )}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`${modalBg} rounded-[50px] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] border-2 border-white/20 animate-in zoom-in-95`}>
                  <div className={`p-8 border-b ${borderColor} flex justify-between items-center`}>
                      <div className="flex items-center gap-4">
                          <div className={`p-3 bg-${themeColor}-100 rounded-2xl text-${themeColor}-600`}>
                              <Settings2 className="w-7 h-7" />
                          </div>
                          <div>
                              <h3 className={`text-2xl font-black ${textColor}`}>{editingId ? 'Edit Product Details' : 'Design New Product'}</h3>
                              <p className={`text-xs font-bold uppercase tracking-widest ${mutedText}`}>Configure catalog specifications</p>
                          </div>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className={`p-3 rounded-full hover:bg-gray-100 ${mutedText} transition-all active:scale-90`}><X className="w-7 h-7" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                          <div className="space-y-8">
                              <div className="space-y-3">
                                  <label className={`block text-[10px] font-black ${mutedText} uppercase tracking-[0.3em]`}>Product Media Visuals</label>
                                  <div className="grid grid-cols-1 gap-4">
                                      <div className={`aspect-video rounded-[35px] border-4 border-dashed ${formData.image ? `border-${themeColor}-200` : 'border-gray-200'} flex items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-${themeColor}-400`} onClick={() => productImageRef.current?.click()}>
                                          {formData.image ? (
                                              <img src={formData.image} className="w-full h-full object-cover" />
                                          ) : (
                                              <div className="text-center">
                                                  <ImageIcon className="w-10 h-10 mx-auto opacity-10 mb-2" />
                                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Main Photo</span>
                                              </div>
                                          )}
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                              <div className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white shadow-xl"><Upload className="w-6 h-6" /></div>
                                              {formData.image && <div className="p-4 bg-red-500/80 backdrop-blur-md rounded-full text-white shadow-xl" onClick={(e) => { e.stopPropagation(); setFormData({...formData, image: ''}); }}><Trash2 className="w-6 h-6" /></div>}
                                          </div>
                                      </div>
                                      
                                      <div className={`aspect-video rounded-[35px] border-4 border-dashed ${formData.video ? 'border-purple-300' : 'border-gray-200'} flex items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-purple-400`} onClick={() => productVideoRef.current?.click()}>
                                          {formData.video ? (
                                              <video src={formData.video} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                          ) : (
                                              <div className="text-center">
                                                  <FileVideo className="w-10 h-10 mx-auto opacity-10 mb-2" />
                                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Add Ambient Video</span>
                                              </div>
                                          )}
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                              <div className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white shadow-xl"><Upload className="w-6 h-6" /></div>
                                              {formData.video && <div className="p-4 bg-red-500/80 backdrop-blur-md rounded-full text-white shadow-xl" onClick={(e) => { e.stopPropagation(); setFormData({...formData, video: ''}); }}><Trash2 className="w-6 h-6" /></div>}
                                          </div>
                                          {isProcessingVideo && <div className="absolute inset-0 bg-white/90 flex items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin w-10 h-10 text-purple-500" /></div>}
                                      </div>
                                  </div>
                                  <input type="file" ref={productImageRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                  <input type="file" ref={productVideoRef} className="hidden" accept="video/*" onChange={handleVideoUpload} />
                              </div>

                              <div className={`p-8 rounded-[40px] border-2 border-dashed ${borderColor} ${isDark ? 'bg-gray-800/40' : 'bg-amber-50/30'}`}>
                                  <div className="flex items-center gap-3 mb-6 text-amber-600">
                                      <Award className="w-6 h-6" />
                                      <span className="text-xs font-black uppercase tracking-[0.2em]">Rewards Engine</span>
                                  </div>
                                  <div className="space-y-6">
                                      <div>
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Redemption Cost (Points)</label>
                                          <input type="number" className={`w-full p-4 border-2 ${borderColor} rounded-[20px] ${inputBg} ${textColor} text-xl font-black focus:border-amber-500 transition-all outline-none`} value={formData.pointsPrice || 0} onChange={(e) => setFormData({...formData, pointsPrice: parseInt(e.target.value) || 0})} placeholder="0" />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="lg:col-span-2 space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="md:col-span-2 flex justify-between items-end gap-6">
                                      <div className="flex-1">
                                        <label className={`block text-[10px] font-black ${mutedText} uppercase tracking-[0.3em] mb-2`}>Product Identity</label>
                                        <input type="text" className={`w-full p-5 border-2 ${borderColor} rounded-[25px] ${inputBg} ${textColor} font-black text-2xl focus:ring-4 focus:ring-${themeColor}-500/10 focus:border-${themeColor}-500 outline-none transition-all`} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Signature Cold Brew" />
                                      </div>
                                      <div className="flex flex-col items-center gap-2 mb-2">
                                          <label className={`text-[10px] font-black ${mutedText} uppercase tracking-[0.3em]`}>Chef's Special</label>
                                          <button 
                                              type="button"
                                              onClick={() => setFormData({...formData, isChefSpecial: !formData.isChefSpecial})}
                                              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${formData.isChefSpecial ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 ring-4 ring-amber-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                          >
                                              <Star className={`w-7 h-7 ${formData.isChefSpecial ? 'fill-white' : ''}`} />
                                          </button>
                                      </div>
                                  </div>
                                  <div>
                                      <label className={`block text-[10px] font-black ${mutedText} uppercase tracking-[0.3em] mb-2`}>Retail Listing Price</label>
                                      <div className="relative">
                                          <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-gray-300">{currency}{sp}</span>
                                          <input type="number" className={`w-full pl-20 p-5 border-2 ${borderColor} rounded-[25px] ${inputBg} ${textColor} font-black text-2xl focus:border-${themeColor}-500 outline-none transition-all shadow-inner`} value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})} />
                                      </div>
                                  </div>
                                  <div>
                                      <label className={`block text-[10px] font-black ${mutedText} uppercase tracking-[0.3em] mb-2`}>Classification</label>
                                      <div className="relative">
                                          <select className={`w-full appearance-none p-5 border-2 ${borderColor} rounded-[25px] ${inputBg} ${textColor} font-black text-lg focus:border-${themeColor}-500 outline-none transition-all cursor-pointer`} value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                                              {availableCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                          </select>
                                          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 pointer-events-none" />
                                      </div>
                                  </div>
                              </div>

                              <div>
                                  <div className="flex justify-between items-center mb-3">
                                      <label className={`block text-[10px] font-black ${mutedText} uppercase tracking-[0.3em]`}>Menu Description</label>
                                      <button type="button" onClick={generateAiDescription} disabled={isGeneratingDescription || !formData.name} className="flex items-center gap-2 text-[10px] font-black text-purple-600 bg-purple-50 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-purple-100 transition-all disabled:opacity-30 active:scale-95 shadow-sm">
                                          {isGeneratingDescription ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                          Enhance with AI
                                      </button>
                                  </div>
                                  <textarea className={`w-full p-6 border-2 ${borderColor} rounded-[30px] ${inputBg} ${textColor} text-base font-medium focus:ring-4 focus:ring-${themeColor}-500/10 focus:border-${themeColor}-500 outline-none resize-none h-32 transition-all leading-relaxed`} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Describe the flavor profiles, origin notes, or artisanal preparation techniques..." />
                              </div>

                              <div className="pt-4">
                                  <div className="flex items-center justify-between mb-8 pb-3 border-b-2 border-gray-100">
                                      <div className="flex items-center gap-3">
                                          <Layers className={`w-6 h-6 text-${themeColor}-600`} />
                                          <h4 className={`text-lg font-black ${textColor} uppercase tracking-[0.2em]`}>Customization Modifiers</h4>
                                      </div>
                                      <div className="flex gap-3">
                                          <button type="button" onClick={() => setIsTemplateModalOpen(true)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-5 py-2.5 rounded-full hover:bg-gray-200 transition-all active:scale-95`}>
                                              <Download className="w-4 h-4" /> Load Template
                                          </button>
                                          <button type="button" onClick={addAddonGroup} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-${themeColor}-600 bg-${themeColor}-50 px-5 py-2.5 rounded-full hover:bg-${themeColor}-600 hover:text-white transition-all active:scale-95 shadow-sm`}>
                                              <Plus className="w-4 h-4" /> New Group
                                          </button>
                                      </div>
                                  </div>

                                  <div className="space-y-6">
                                      {formData.addons?.length === 0 ? (
                                          <div className="text-center py-12 border-4 border-dashed border-gray-50 rounded-[40px]">
                                              <Layers className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                              <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.4em]">No specific modifiers applied</p>
                                          </div>
                                      ) : (
                                          formData.addons?.map(group => (
                                              <div key={group.id} className={`${isDark ? 'bg-gray-800' : 'bg-gray-50/50'} border-2 ${borderColor} rounded-[35px] p-8 shadow-sm relative group/item transition-all hover:border-${themeColor}-200`}>
                                                  <button onClick={() => removeAddonGroup(group.id)} className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 transition-colors active:scale-90">
                                                      <Trash2 className="w-6 h-6" />
                                                  </button>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pr-12">
                                                      <div>
                                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Modifier Group Name</label>
                                                          <input 
                                                              type="text" 
                                                              className={`w-full p-3 border-2 ${borderColor} rounded-xl text-sm font-black focus:border-${themeColor}-500 outline-none transition-all`} 
                                                              value={group.name} 
                                                              onChange={(e) => updateAddonGroup(group.id, { name: e.target.value })} 
                                                              placeholder="e.g. Size Preference" 
                           />
                                                      </div>
                                                      <div className="flex items-center gap-8 pt-6">
                                                          <label className="flex items-center gap-3 cursor-pointer text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                                              <input type="checkbox" className={`w-5 h-5 rounded-lg text-${themeColor}-600`} checked={group.required} onChange={(e) => updateAddonGroup(group.id, { required: e.target.checked })} />
                                                              Required
                                                          </label>
                                                          <label className="flex items-center gap-3 cursor-pointer text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                                              <input type="checkbox" className={`w-5 h-5 rounded-lg text-${themeColor}-600`} checked={group.multiple} onChange={(e) => updateAddonGroup(group.id, { multiple: e.target.checked })} />
                                                              Multiple
                                                          </label>
                                                      </div>
                                                  </div>

                                                  <div className="space-y-3 ml-6 border-l-4 border-gray-100 pl-8">
                                                      {group.options.map(opt => (
                                                          <div key={opt.id} className="flex items-center gap-4 animate-in slide-in-from-left duration-300">
                                                              <input type="text" className={`flex-1 p-3 border-2 ${borderColor} rounded-xl text-xs font-bold focus:border-${themeColor}-400 outline-none`} value={opt.name} onChange={(e) => updateAddonOption(group.id, opt.id, { name: e.target.value })} placeholder="Option Label (e.g. Extra Shot)" />
                                                              <div className="relative w-32">
                                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">+ {currency}</span>
                                                                  <input type="number" className={`w-full pl-12 p-3 border-2 ${borderColor} rounded-xl text-xs text-right font-black focus:border-${themeColor}-400 outline-none`} value={opt.price} onChange={(e) => updateAddonOption(group.id, opt.id, { price: parseFloat(e.target.value) || 0 })} />
                                                              </div>
                                                              <button onClick={() => removeAddonOption(group.id, opt.id)} className="p-2 text-gray-200 hover:text-red-400 active:scale-90 transition-all">
                                                                  <X className="w-5 h-5" />
                                                              </button>
                                                          </div>
                                                      ))}
                                                      <button type="button" onClick={() => addAddonOption(group.id)} className={`text-[10px] font-black uppercase text-${themeColor}-600 tracking-[0.3em] flex items-center gap-2 hover:opacity-70 py-4 active:scale-95 transition-all`}>
                                                          <Plus className="w-4 h-4" /> Add Option Line
                                                      </button>
                                                  </div>
                                              </div>
                                          ))
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className={`p-10 border-t ${borderColor} ${isDark ? 'bg-gray-800' : 'bg-gray-50'} flex gap-4 shadow-inner`}>
                      <button onClick={() => setIsModalOpen(false)} className={`flex-1 py-5 px-10 border-2 ${borderColor} rounded-[30px] font-black text-sm uppercase tracking-widest ${mutedText} hover:bg-white transition-all active:scale-95`}>Discard Changes</button>
                      <button onClick={handleSave} className={`flex-[2] py-5 px-10 bg-${themeColor}-600 text-white rounded-[30px] font-black text-sm uppercase tracking-widest shadow-xl shadow-${themeColor}-200 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-3`}>
                          <CheckCircle className="w-5 h-5" /> Commit to Catalog
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isTemplateModalOpen && (
          <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-xl">
              <div className={`${modalBg} rounded-[40px] shadow-2xl w-full max-md overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95`}>
                  <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                      <div>
                        <h4 className="font-black text-lg uppercase tracking-tight">Modifier Presets</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reuse global definitions</p>
                      </div>
                      <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all active:scale-90"><X className="w-6 h-6 text-gray-400" /></button>
                  </div>
                  <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {settings?.globalAddons && settings.globalAddons.length > 0 ? (
                          settings.globalAddons.map(template => (
                              <button 
                                key={template.id} 
                                onClick={() => loadFromTemplate(template)}
                                className={`w-full text-left p-6 rounded-[25px] border-2 ${borderColor} hover:border-${themeColor}-500 hover:bg-${themeColor}-50 transition-all group active:scale-[0.98] shadow-sm`}
                              >
                                  <div className="flex justify-between items-center mb-3">
                                      <p className="font-black text-base group-hover:text-blue-700">{template.name}</p>
                                      <div className="flex gap-1.5">
                                          {template.required && <span className="text-[8px] bg-red-100 text-red-600 px-2 py-1 rounded-full uppercase font-black">Req</span>}
                                          {template.multiple && <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full uppercase font-black">Multi</span>}
                                      </div>
                                  </div>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                                      {template.options.map(o => o.name).join(' • ')}
                                  </p>
                              </button>
                          ))
                      ) : (
                          <div className="text-center py-16 opacity-30">
                              <Settings className="w-16 h-16 mx-auto mb-4" />
                              <p className="text-sm font-black uppercase tracking-widest">No Library Found</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProductManager;

import React, { useState, useMemo, useRef } from 'react';
import { Member, ShopSettings, User } from '../types';
import { Search, Plus, User as UserIcon, Edit2, Trash, X, Mail, Phone, ShoppingCart, Snowflake, UserCheck, MapPin, Hash, Calendar, FileText, Award, Save, CheckCircle, Upload, Download, FileSpreadsheet, ChevronDown, AlertCircle } from 'lucide-react';
import { getTranslation } from '../utils/translations';

interface MemberManagerProps {
  members: Member[];
  setMembers: (members: Member[]) => void;
  settings: ShopSettings;
  onSelectMemberForOrder: (member: Member) => void;
  currentUser: User;
}

// Common states/regions
const STATES = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 
    'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur', 
    'W.P. Labuan', 'W.P. Putrajaya', 'Other'
];

const MemberManager: React.FC<MemberManagerProps> = ({ members, setMembers, settings, onSelectMemberForOrder, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [errors, setErrors] = useState<{ phone?: string; email?: string; name?: string }>({});
  const importInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Member>>({
      name: '',
      phone: '',
      email: '',
      memberCode: '',
      address: '',
      postcode: '',
      state: '',
      points: 0,
      birthday: '',
      notes: ''
  });

  const t = (key: any) => getTranslation(settings.language, key);
  const { themeColor, backgroundColor, textColor, inputBackground } = settings.appearance;
  const isDark = backgroundColor.includes('900') || backgroundColor.includes('800');
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.phone.includes(searchQuery) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.memberCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  const handleOpenModal = (member?: Member) => {
      setErrors({});
      if (member) {
          setEditingMember(member);
          setFormData({ ...member });
      } else {
          setEditingMember(null);
          setFormData({
              name: '',
              phone: '',
              email: '',
              memberCode: `MBR-${Date.now().toString().slice(-6)}`,
              address: '',
              postcode: '',
              state: '',
              points: 0,
              birthday: '',
              notes: ''
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = () => {
      const newErrors: typeof errors = {};
      
      if (!formData.name?.trim()) newErrors.name = "Full name is required.";
      if (!formData.phone?.trim()) newErrors.phone = "Phone number is required.";

      // --- Duplicate Verification ---
      const cleanPhone = formData.phone?.trim() || "";
      const cleanEmail = formData.email?.trim().toLowerCase() || "";

      // Check Phone
      const duplicatePhone = members.find(m => m.phone.trim() === cleanPhone && m.id !== editingMember?.id);
      if (duplicatePhone) {
          newErrors.phone = `Already assigned to: ${duplicatePhone.name}`;
      }

      // Check Email (if provided)
      if (cleanEmail) {
          const duplicateEmail = members.find(m => m.email?.trim().toLowerCase() === cleanEmail && m.id !== editingMember?.id);
          if (duplicateEmail) {
              newErrors.email = `Already assigned to: ${duplicateEmail.name}`;
          }
      }

      if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
      }

      const newMembers = [...members];
      if (editingMember) {
          const index = newMembers.findIndex(m => m.id === editingMember.id);
          if (index !== -1) {
              newMembers[index] = { 
                  ...editingMember, 
                  ...formData, 
                  phone: cleanPhone,
                  email: cleanEmail || undefined,
                  lastUpdated: Date.now() 
              } as Member;
          }
      } else {
          const newMember: Member = {
              ...formData,
              phone: cleanPhone,
              email: cleanEmail || undefined,
              id: Date.now().toString(),
              joinDate: Date.now(),
              lastUpdated: Date.now(),
              points: formData.points || 0,
              favorites: []
          } as Member;
          newMembers.unshift(newMember);
      }

      setMembers(newMembers);
      setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('delete') + '?')) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  const handleToggleFreeze = (id: string) => {
      setMembers(members.map(m => m.id === id ? { ...m, isFrozen: !m.isFrozen } : m));
  };

  const normalizeDate = (dateStr: string): string | undefined => {
      if (!dateStr) return undefined;
      const clean = dateStr.trim();
      if (!clean) return undefined;
      const parts = clean.split(/[/\-.]/);
      if (parts.length === 3 && parts[0].length === 4) return clean;
      if (parts.length === 3 && parts[2].length === 4) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
      }
      return clean;
  };

  const handleDownloadTemplate = () => {
      const headers = ["Name", "Phone", "Email", "MemberCode", "Address", "Postcode", "State", "Points", "Birthday (YYYY-MM-DD)", "Notes"];
      const sample = ["John Doe", "0123456789", "john@example.com", "MBR-101", "123 Main St", "50000", "Selangor", "100", "1990-01-01", "Regular customer"];
      const csvContent = headers.join(',') + '\n' + sample.join(',');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.body.appendChild(document.createElement('a'));
      link.href = url; link.download = 'customer_template.csv'; link.click(); document.body.removeChild(link);
  };

  const handleExportMembers = () => {
      const headers = ["Name", "Phone", "Email", "MemberCode", "Address", "Postcode", "State", "Points", "Birthday", "Notes"];
      const rows = members.map(m => [m.name, m.phone, m.email || '', m.memberCode || '', (m.address || '').replace(/,/g, ' '), m.postcode || '', m.state || '', m.points, m.birthday || '', (m.notes || '').replace(/,/g, ' ')].join(','));
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.body.appendChild(document.createElement('a'));
      link.href = url; link.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`; link.click(); document.body.removeChild(link);
  };

  const handleImportMembers = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          const lines = content.split('\n');
          const imported: Member[] = [];
          
          const existingPhones = new Set(members.map(m => m.phone.trim()));
          const existingEmails = new Set(members.filter(m => m.email).map(m => m.email!.trim().toLowerCase()));
          
          let skippedDuplicates = 0;
          let newRecords = 0;

          for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const cols = lines[i].split(',').map(c => c.trim());
              const [name, phone, email, memberCode, address, postcode, state, points, birthday, notes] = cols;
              
              if (name && phone) {
                  const cleanPhone = phone;
                  const cleanEmail = email?.toLowerCase();

                  const isPhoneDup = existingPhones.has(cleanPhone);
                  const isEmailDup = cleanEmail && existingEmails.has(cleanEmail);

                  if (isPhoneDup || isEmailDup) {
                      skippedDuplicates++;
                      continue;
                  }

                  existingPhones.add(cleanPhone);
                  if (cleanEmail) existingEmails.add(cleanEmail);

                  imported.push({
                      id: `imp-${Date.now()}-${i}`,
                      name,
                      phone: cleanPhone,
                      email: cleanEmail || undefined,
                      memberCode: memberCode || `MBR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                      address: address || undefined,
                      postcode: postcode || undefined,
                      state: state || undefined,
                      points: parseInt(points) || 0,
                      birthday: normalizeDate(birthday),
                      notes: notes || undefined,
                      joinDate: Date.now(),
                      lastUpdated: Date.now(),
                      favorites: [],
                      isSynced: false
                  });
                  newRecords++;
              }
          }
          
          if (imported.length > 0) {
              setMembers([...imported, ...members]);
              alert(`IMPORT COMPLETE!\n\nSuccessfully added: ${newRecords} customers.\nSkipped duplicates: ${skippedDuplicates} records.\n\nDuplicated Phone or Email entries are automatically filtered.`);
          } else if (skippedDuplicates > 0) {
              alert(`IMPORT FAILED\n\nAll ${skippedDuplicates} records in the file were identified as duplicates.`);
          } else {
              alert("No valid customers found in the file.");
          }
      };
      reader.readAsText(file);
      if (importInputRef.current) importInputRef.current.value = '';
  };

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  return (
    <div className={`p-6 h-full overflow-y-auto ${backgroundColor}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
          <h2 className={`text-2xl font-bold ${textColor}`}>{t('activeMembers')}</h2>
          <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-center sm:justify-end">
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${mutedText} w-4 h-4`} />
              <input 
                type="text" 
                placeholder={t('search')} 
                className={`w-full pl-9 pr-4 py-2 border ${borderColor} rounded-xl ${inputBackground} ${textColor} outline-none focus:ring-2 focus:ring-${themeColor}-500 transition-all text-sm`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
                <button onClick={handleDownloadTemplate} className="p-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 text-xs font-bold" title={t('template')}>
                    <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">{t('template')}</span>
                </button>
                <button onClick={() => importInputRef.current?.click()} className="p-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 text-xs font-bold" title={t('import')}>
                    <Upload className="w-4 h-4" /> <span className="hidden sm:inline">{t('import')}</span>
                </button>
                <input type="file" ref={importInputRef} className="hidden" accept=".csv" onChange={handleImportMembers} />
                <button onClick={handleExportMembers} className="p-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 text-xs font-bold" title={t('export')}>
                    <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t('export')}</span>
                </button>
                <button 
                    onClick={() => handleOpenModal()}
                    className={`bg-${themeColor}-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-${themeColor}-700 shadow-md transition-colors whitespace-nowrap text-sm`}
                >
                <Plus className="w-4 h-4" /> {t('add')}
                </button>
            </div>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
            <div className={`text-center py-20 ${mutedText}`}>
                <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">{t('noMembers')}</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map(member => (
                <div key={member.id} className={`${cardBg} p-5 rounded-2xl border ${borderColor} shadow-sm group hover:shadow-md transition-all relative overflow-hidden`}>
                  {member.isFrozen && (
                      <div className="absolute top-0 right-0 p-2 bg-blue-500 text-white rounded-bl-xl z-10" title="Frozen Account">
                          <Snowflake className="w-4 h-4" />
                      </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-${themeColor}-100 flex items-center justify-center text-${themeColor}-600 flex-shrink-0`}>
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-bold ${textColor} truncate text-lg`}>{member.name}</h3>
                        <p className={`text-xs ${mutedText} flex items-center gap-1`}><Phone className="w-3 h-3" /> {member.phone}</p>
                        {member.email && <p className={`text-[10px] ${mutedText} flex items-center gap-1 mt-0.5 truncate`}><Mail className="w-2.5 h-2.5" /> {member.email}</p>}
                      </div>
                    </div>
                    <button 
                        onClick={() => onSelectMemberForOrder(member)}
                        disabled={member.isFrozen}
                        className={`p-2.5 rounded-xl bg-${themeColor}-50 text-${themeColor}-600 hover:bg-${themeColor}-600 hover:text-white disabled:opacity-30 transition-all shadow-sm flex-shrink-0`}
                        title={t('charge')}
                    >
                        <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className={`px-3 py-2 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} border ${borderColor}`}>
                          <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-wider`}>Points</p>
                          <p className={`text-lg font-bold text-${themeColor}-600`}>{member.points}</p>
                      </div>
                      <div className={`px-3 py-2 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} border ${borderColor}`}>
                          <p className={`text-[10px] font-bold ${mutedText} uppercase tracking-wider`}>Member ID</p>
                          <p className={`text-sm font-bold ${textColor} truncate`}>{member.memberCode || 'N/A'}</p>
                      </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100/10">
                    <span className={`text-[10px] ${mutedText}`}>Joined: {new Date(member.joinDate).toLocaleDateString()}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleToggleFreeze(member.id)} 
                        className={`p-2 rounded-lg transition-colors ${member.isFrozen ? 'text-blue-500 bg-blue-50' : `text-gray-400 hover:bg-gray-100`}`}
                        title={member.isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
                      >
                        {member.isFrozen ? <UserCheck className="w-4 h-4" /> : <Snowflake className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => handleOpenModal(member)}
                        className={`p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors`}
                        title={t('edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(member.id)} 
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title={t('delete')}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>

      {/* Member Edit/Add Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}>
                  <div className={`p-6 border-b ${borderColor} flex justify-between items-center`}>
                      <div className="flex items-center gap-3">
                          <div className={`p-2 bg-${themeColor}-100 rounded-xl text-${themeColor}-600`}>
                            {editingMember ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                          </div>
                          <h3 className={`text-xl font-bold ${textColor}`}>{editingMember ? t('editCustomer') : t('newCustomer')}</h3>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className={`p-2 ${mutedText} hover:bg-gray-100 rounded-full transition-colors`}><X className="w-6 h-6" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <div>
                                  <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>Full Name *</label>
                                  <div className="relative">
                                      <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.name ? 'text-red-500' : 'text-gray-400'}`} />
                                      <input 
                                        type="text" 
                                        className={`w-full pl-9 pr-4 py-2.5 border ${errors.name ? 'border-red-500 ring-1 ring-red-500' : borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none`} 
                                        value={formData.name} 
                                        onChange={(e) => { setFormData({...formData, name: e.target.value}); if(errors.name) setErrors({...errors, name: undefined}); }} 
                                        placeholder="John Doe" 
                                      />
                                  </div>
                                  {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold animate-in fade-in slide-in-from-top-1">{errors.name}</p>}
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>Phone Number *</label>
                                  <div className="relative">
                                      <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.phone ? 'text-red-500' : 'text-gray-400'}`} />
                                      <input 
                                        type="tel" 
                                        className={`w-full pl-9 pr-4 py-2.5 border ${errors.phone ? 'border-red-500 ring-1 ring-red-500' : borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none`} 
                                        value={formData.phone} 
                                        onChange={(e) => { setFormData({...formData, phone: e.target.value}); if(errors.phone) setErrors({...errors, phone: undefined}); }} 
                                        placeholder="0123456789" 
                                      />
                                  </div>
                                  {errors.phone && <p className="text-red-500 text-[10px] mt-1 font-bold animate-in fade-in slide-in-from-top-1">{errors.phone}</p>}
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>Email Address</label>
                                  <div className="relative">
                                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.email ? 'text-red-500' : 'text-gray-400'}`} />
                                      <input 
                                        type="email" 
                                        className={`w-full pl-9 pr-4 py-2.5 border ${errors.email ? 'border-red-500 ring-1 ring-red-500' : borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none`} 
                                        value={formData.email} 
                                        onChange={(e) => { setFormData({...formData, email: e.target.value}); if(errors.email) setErrors({...errors, email: undefined}); }} 
                                        placeholder="john@example.com" 
                                      />
                                  </div>
                                  {errors.email ? (
                                      <p className="text-red-500 text-[10px] mt-1 font-bold animate-in fade-in slide-in-from-top-1">{errors.email}</p>
                                  ) : (
                                      <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Email must be unique if provided.</p>
                                  )}
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>Custom Member Code</label>
                                  <div className="relative">
                                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                      <input type="text" className={`w-full pl-9 pr-4 py-2.5 border ${borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none`} value={formData.memberCode} onChange={(e) => setFormData({...formData, memberCode: e.target.value})} placeholder="MBR-001" />
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-4">
                              <div>
                                  <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>Residential Address</label>
                                  <div className="relative">
                                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                      <textarea className={`w-full pl-9 pr-4 py-2.5 border ${borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none resize-none`} rows={3} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="House No, Street Name..." />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>Postcode</label>
                                      <input type="text" className={`w-full px-3 py-2.5 border ${borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none`} value={formData.postcode} onChange={(e) => setFormData({...formData, postcode: e.target.value})} placeholder="12345" />
                                  </div>
                                  <div>
                                      <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>State</label>
                                      <div className="relative">
                                          <select 
                                            className={`w-full appearance-none px-3 py-2.5 border ${borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none cursor-pointer pr-10`}
                                            value={formData.state || ''}
                                            onChange={(e) => setFormData({...formData, state: e.target.value})}
                                          >
                                              <option value="" disabled>Select State...</option>
                                              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                          </select>
                                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                      </div>
                                  </div>
                              </div>
                              <div>
                                  <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>Birthday</label>
                                  <div className="relative">
                                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                      <input type="date" className={`w-full pl-9 pr-4 py-2.5 border ${borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none`} value={formData.birthday} onChange={(e) => setFormData({...formData, birthday: e.target.value})} />
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100/10 grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>Loyalty Points Balance</label>
                            <div className="relative">
                                <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                <input 
                                    type="number" 
                                    className={`w-full pl-9 pr-4 py-2.5 border ${borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none font-bold`} 
                                    value={formData.points} 
                                    onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                                    disabled={!isAdmin}
                                    title={!isAdmin ? "Only Admin/Manager can edit points" : ""}
                                />
                            </div>
                         </div>
                         <div>
                            <label className={`block text-xs font-bold ${mutedText} uppercase tracking-wider mb-1.5`}>Staff Notes</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <textarea className={`w-full pl-9 pr-4 py-2.5 border ${borderColor} rounded-xl ${inputBackground} ${textColor} text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none resize-none`} rows={2} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="VIP Customer, prefers cold brew..." />
                            </div>
                         </div>
                      </div>
                  </div>
                  
                  <div className={`p-6 border-t ${borderColor} ${isDark ? 'bg-gray-800' : 'bg-gray-50'} flex gap-3`}>
                      <button onClick={() => setIsModalOpen(false)} className={`flex-1 py-3 px-4 rounded-xl border ${borderColor} ${mutedText} font-bold text-sm hover:bg-gray-100 transition-colors`}>{t('cancel')}</button>
                      <button onClick={handleSave} className={`flex-[2] py-3 px-4 rounded-xl bg-${themeColor}-600 text-white font-bold text-sm shadow-lg shadow-${themeColor}-200 hover:bg-${themeColor}-700 transition-all flex items-center justify-center gap-2`}>
                          <Save className="w-4 h-4" /> {t('save')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default MemberManager;


import React, { useMemo, useState } from 'react';
import { Transaction, ShopSettings, Member } from '../types';
// Add missing 'Receipt' import from lucide-react
import { Search, Clock, Printer, Download, Mail, Loader2, Send, X, CloudUpload, CheckCircle, FileSpreadsheet, AlertCircle, BarChart3, List, Receipt } from 'lucide-react';
import { printReceipt, generateReceiptEmailHtml } from '../services/printerService';
import { getTranslation } from '../utils/translations';
import Dashboard from './Dashboard';

declare global {
  interface Window {
    emailjs: any;
  }
}

interface TransactionsListProps {
  transactions: Transaction[];
  settings: ShopSettings;
  members: Member[];
}

const TransactionsList: React.FC<TransactionsListProps> = ({ transactions, settings, members }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'insights'>('history');
  const [filter, setFilter] = useState('');
  const [emailTarget, setEmailTarget] = useState<Transaction | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const { themeColor, inputBackground, inputDensity, textColor } = settings.appearance;
  const backgroundColor = settings.appearance.backgroundColor || 'bg-gray-50';
  const sp = '\u00A0';
  const t = (key: any) => getTranslation(settings.language, key);

  const isDark = backgroundColor.includes('900') || backgroundColor.includes('800');
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  const filtered = useMemo(() => {
    return transactions.filter(t => 
      (t.orderNumber || t.id).toLowerCase().includes(filter.toLowerCase()) || 
      t.total.toString().includes(filter) ||
      t.note?.toLowerCase().includes(filter.toLowerCase()) ||
      t.memberName?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [transactions, filter]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Order Number', 'Customer', 'Cashier', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment Methods', 'Notes'];
    const rows = filtered.map(tx => {
      const itemsStr = tx.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
      const paymentsStr = tx.payments.map(p => `${p.methodName}: ${settings.currency}${p.amount.toFixed(2)}`).join(' | ');
      return [`"${new Date(tx.timestamp).toLocaleString()}"`, `"${tx.orderNumber}"`, `"${tx.memberName || 'Guest'}"`, `"${tx.cashierName || 'N/A'}"`, `"${itemsStr}"`, tx.subtotal.toFixed(2), (tx.discount || 0).toFixed(2), tx.taxTotal.toFixed(2), tx.total.toFixed(2), `"${paymentsStr}"`, `"${tx.note || ''}"`].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url; link.download = `transactions_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click(); document.body.removeChild(link);
  };

  const sendEmail = async () => {
      if (!settings.emailConfig?.serviceId || !settings.emailConfig?.publicKey || !settings.emailConfig?.templateId) {
          alert("Email Integration not configured. Please visit Shop Settings to set up your EmailJS keys.");
          return;
      }
      if (!emailAddress || !emailTarget) return;
      setIsSending(true);
      try {
          const templateParams = {
              to_email: emailAddress,
              to_name: emailTarget.memberName || 'Customer',
              shop_name: settings.shopName,
              order_number: emailTarget.orderNumber,
              total: `${emailTarget.currency}${sp}${emailTarget.total.toFixed(2)}`,
              receipt_html: generateReceiptEmailHtml(emailTarget, settings)
          };
          await window.emailjs.send(settings.emailConfig.serviceId, settings.emailConfig.templateId, templateParams, settings.emailConfig.publicKey);
          setSendSuccess(true);
          setTimeout(() => { setEmailTarget(null); setSendSuccess(false); setEmailAddress(''); }, 2000);
      } catch (error) { 
          console.error(error); 
          alert("Failed to send email. Check your connection or EmailJS configuration.");
      }
      finally { setIsSending(false); }
  };

  return (
    <div className={`h-full flex flex-col ${backgroundColor} overflow-hidden`}>
      <div className={`border-b ${borderColor} ${cardBg} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm z-10`}>
          <div className="flex items-center gap-3">
              <Receipt className={`w-8 h-8 text-${themeColor}-600`} />
              <h2 className={`text-2xl font-black ${textColor}`}>History & Insights</h2>
          </div>

          <div className="flex bg-gray-200/50 p-1 rounded-2xl border border-gray-200/20 gap-1">
              <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'history' ? `bg-${themeColor}-600 text-white shadow-lg` : `${mutedText} hover:bg-white/10`}`}
              >
                  <List className="w-4 h-4" />
                  Records
              </button>
              <button
                  onClick={() => setActiveTab('insights')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'insights' ? `bg-${themeColor}-600 text-white shadow-lg` : `${mutedText} hover:bg-white/10`}`}
              >
                  <BarChart3 className="w-4 h-4" />
                  Insights
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'history' ? (
          <div className="p-6 h-full flex flex-col">
            <div className={`max-w-6xl mx-auto w-full flex-1 flex flex-col ${cardBg} rounded-2xl shadow-sm border ${borderColor} overflow-hidden`}>
              <div className={`p-6 border-b ${borderColor} flex flex-col sm:flex-row justify-between items-center gap-4`}>
                <div className="flex items-center gap-3">
                  <h2 className={`text-2xl font-bold ${textColor}`}>{t('transactionHistory')}</h2>
                  <span className={`px-2 py-0.5 rounded-full bg-${themeColor}-50 text-${themeColor}-600 text-[10px] font-bold uppercase`}>{filtered.length} Total</span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${mutedText} w-4 h-4`} />
                      <input type="text" placeholder={t('search')} className={`w-full pl-9 pr-4 py-2 border ${borderColor} rounded-lg outline-none text-sm ${inputBackground} ${textColor}`} value={filter} onChange={(e) => setFilter(e.target.value)} />
                  </div>
                  <button onClick={handleExportCSV} disabled={filtered.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm text-sm font-bold disabled:opacity-50"><FileSpreadsheet className="w-4 h-4" /><span className="hidden md:inline">{t('export')}</span></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                   <div className={`flex flex-col items-center justify-center h-full ${mutedText}`}><Clock className="w-12 h-12 mb-2 opacity-50" /><p>{t('noTransactions')}</p></div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} ${mutedText} font-medium text-xs uppercase tracking-wider sticky top-0 z-10`}>
                      <tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Order #</th><th className="px-6 py-4">Items</th><th className="px-6 py-4 text-right">{t('total')}</th><th className="px-6 py-4 w-24 text-right">Actions</th></tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {filtered.map(tx => (
                        <tr key={tx.id} className={`${hoverBg} transition-colors`}>
                          <td className="px-6 py-4">{tx.isSynced ? <div className="flex items-center gap-1 text-green-500"><CheckCircle className="w-4 h-4" /><span className="text-[10px] font-bold">LIVE</span></div> : <div className="flex items-center gap-1 text-amber-500"><CloudUpload className="w-4 h-4" /><span className="text-[10px] font-bold">LOCAL</span></div>}</td>
                          <td className="px-6 py-4"><div className={`text-sm font-bold ${textColor}`}>{tx.orderNumber}</div><div className={`text-[10px] ${mutedText}`}>{new Date(tx.timestamp).toLocaleString()}</div></td>
                          <td className="px-6 py-4"><div className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'} line-clamp-1`}>{tx.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</div></td>
                          <td className="px-6 py-4 text-right font-bold ${textColor}">{tx.currency}{sp}{tx.total.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            {/* Fixed lookup by using members prop instead of settings.members */}
                            <div className="flex justify-end gap-2"><button onClick={() => { setEmailAddress(tx.memberId ? members?.find(m => m.id === tx.memberId)?.email || '' : ''); setEmailTarget(tx); }} className={`p-2 rounded-lg ${mutedText} hover:text-blue-600 transition-colors`} title="Email Receipt"><Mail className="w-4 h-4" /></button><button onClick={() => printReceipt(tx, settings)} className={`p-2 rounded-lg ${mutedText} hover:text-${themeColor}-600 transition-colors`} title="Print Receipt"><Printer className="w-4 h-4" /></button></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Dashboard transactions={transactions} settings={settings} />
        )}
      </div>

      {emailTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className={`${cardBg} rounded-2xl shadow-2xl w-full max-sm:max-w-xs max-w-sm overflow-hidden animate-in zoom-in-95`}>
                  <div className={`p-6 border-b ${borderColor} flex justify-between items-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div><h3 className={`font-black text-lg ${textColor}`}>Email Receipt</h3><p className="text-[10px] uppercase font-bold text-gray-400">Order {emailTarget.orderNumber}</p></div>
                      <button onClick={() => setEmailTarget(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-8">
                      {sendSuccess ? (
                          <div className="text-center py-6 animate-in zoom-in">
                              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-10 h-10" /></div>
                              <p className="font-bold text-green-600">Receipt Dispatched!</p>
                          </div>
                      ) : (
                          <>
                            <div className="mb-6"><label className="block text-xs font-black uppercase text-gray-400 mb-2">Customer Email</label><input type="email" placeholder="customer@email.com" className={`w-full p-4 border-2 ${borderColor} rounded-2xl text-lg font-bold outline-none focus:border-${themeColor}-500 transition-all ${inputBackground} ${textColor}`} value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} autoFocus /></div>
                            <div className="flex flex-col gap-2">
                                <button onClick={sendEmail} disabled={!emailAddress || isSending} className={`w-full py-4 bg-${themeColor}-600 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50`}>
                                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Send Digital Receipt
                                </button>
                                {!settings.emailConfig?.serviceId && (
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-700 leading-tight">Integration not configured. This will fail unless EmailJS keys are set in Shop Settings.</p>
                                    </div>
                                )}
                            </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TransactionsList;

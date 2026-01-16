
import React, { useState, useMemo } from 'react';
import { Transaction, ShopSettings } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Sparkles, Loader } from 'lucide-react';
import { analyzeSalesTrends } from '../services/geminiService';
import { getTranslation } from '../utils/translations';

interface DashboardProps {
  transactions: Transaction[];
  settings?: ShopSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, settings }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const themeColor = settings?.appearance.themeColor || 'blue';
  const backgroundColor = settings?.appearance.backgroundColor || 'bg-gray-50';
  const inputDensity = settings?.appearance.inputDensity || 'comfortable';
  const sp = '\u00A0';
  
  const t = (key: any) => getTranslation(settings?.language, key);

  const containerPadding = inputDensity === 'compact' ? 'p-4 md:p-6' : 'p-6 md:p-8';
  const cardPadding = inputDensity === 'compact' ? 'p-4' : 'p-6';
  const gapSize = inputDensity === 'compact' ? 'gap-3' : 'gap-4';

  const stats = useMemo(() => {
    const totalRev = transactions.reduce((acc, t) => acc + t.total, 0);
    const totalTx = transactions.length;
    const avgOrder = totalTx > 0 ? totalRev / totalTx : 0;
    const itemCounts: Record<string, number> = {};
    transactions.forEach(t => {
      t.items.forEach(i => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
      });
    });
    const bestSeller = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
    return { revenue: totalRev, count: totalTx, avg: avgOrder, topItem: bestSeller ? bestSeller[0] : 'N/A' };
  }, [transactions]);

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    return transactions.slice(0, 10).reverse().map((t, idx) => ({ name: `Tx ${idx + 1}`, amount: t.total }));
  }, [transactions]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeSalesTrends(transactions);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const Card = ({ title, value, icon: Icon, color }: any) => (
    <div className={`bg-white ${cardPadding} rounded-xl shadow-sm border border-gray-100 flex items-start justify-between`}>
      <div><p className="text-gray-500 text-sm font-medium mb-1">{title}</p><h3 className="text-2xl font-bold text-gray-800">{value}</h3></div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}><Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} /></div>
    </div>
  );

  return (
    <div className={`${containerPadding} h-full overflow-y-auto ${backgroundColor}`}>
      <div className={`max-w-7xl mx-auto ${inputDensity === 'compact' ? 'space-y-4' : 'space-y-6'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">{t('overview')}</h2>
          <button onClick={handleAiAnalysis} disabled={isAnalyzing || transactions.length === 0} className={`flex items-center gap-2 bg-gradient-to-r from-${themeColor}-500 to-${themeColor}-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}>{isAnalyzing ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}<span>{t('askAI')}</span></button>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${gapSize}`}>
          <Card title={t('totalRevenue')} value={`${settings?.currency || '$'}${sp}${stats.revenue.toFixed(2)}`} icon={DollarSign} color="bg-green-500" />
          <Card title={t('transactions')} value={stats.count} icon={ShoppingBag} color={`bg-${themeColor}-500`} />
          <Card title={t('avgOrderValue')} value={`${settings?.currency || '$'}${sp}${stats.avg.toFixed(2)}`} icon={TrendingUp} color="bg-purple-500" />
          <Card title={t('topProduct')} value={stats.topItem} icon={Sparkles} color="bg-amber-500" />
        </div>
        {aiAnalysis && (<div className={`bg-white rounded-xl shadow-md border border-${themeColor}-100 ${cardPadding} animate-in fade-in slide-in-from-top-4 duration-500`}><div className="flex items-center gap-3 mb-4"><div className={`p-2 bg-${themeColor}-100 rounded-lg`}><Sparkles className={`w-5 h-5 text-${themeColor}-600`} /></div><h3 className="font-bold text-gray-800">{t('aiInsights')}</h3></div><div className={`prose prose-${themeColor} text-gray-600 max-w-none`}><pre className="whitespace-pre-wrap font-sans text-sm">{aiAnalysis}</pre></div></div>)}
        <div className={`bg-white ${cardPadding} rounded-xl shadow-sm border border-gray-100`}><h3 className="text-lg font-bold text-gray-800 mb-6">{t('salesTrend')}</h3><div className="h-80 w-full">{chartData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${settings?.currency || '$'}${sp}${value}`} /><Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Bar dataKey="amount" radius={[4, 4, 0, 0]}>{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />))}</Bar></BarChart></ResponsiveContainer>) : (<div className="flex items-center justify-center h-full text-gray-400">No data available</div>)}</div></div>
      </div>
    </div>
  );
};

export default Dashboard;

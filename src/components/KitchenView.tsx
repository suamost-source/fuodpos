
import React, { useMemo, useState } from 'react';
import { PendingOrder, ShopSettings, OrderStatus, CartItem } from '../types';
import { Clock, CheckCircle, ChefHat, User, MessageSquare, MapPin, Coffee, Utensils, Croissant, LayoutGrid, RotateCcw } from 'lucide-react';

interface KitchenViewProps {
    orders: PendingOrder[];
    onUpdateStatus: (orderId: string, status: OrderStatus, stationId?: string) => void;
    settings: ShopSettings;
}

type Station = 'all' | 'kitchen' | 'drinks' | 'bakery';

const KitchenView: React.FC<KitchenViewProps> = ({ orders, onUpdateStatus, settings }) => {
    const [activeStation, setActiveStation] = useState<Station>('kitchen');
    const { themeColor, backgroundColor, textColor } = settings.appearance;

    const isDark = backgroundColor.includes('900') || backgroundColor.includes('800');
    const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
    const mutedText = isDark ? 'text-gray-400' : 'text-gray-500';

    const getStationItems = (orderItems: CartItem[], station: Station) => {
        if (station === 'all') return orderItems;
        if (station === 'drinks') return orderItems.filter(i => ['Drinks', 'Coffee'].includes(i.category));
        if (station === 'bakery') return orderItems.filter(i => i.category === 'Bakery');
        if (station === 'kitchen') return orderItems.filter(i => !['Drinks', 'Coffee', 'Bakery'].includes(i.category));
        return [];
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (o.status === 'completed') return false;
            if (activeStation === 'all') return true;
            // Only show orders that have items for the current station
            const items = getStationItems(o.items, activeStation);
            return items.length > 0;
        }).sort((a, b) => a.timestamp - b.timestamp);
    }, [orders, activeStation]);

    const getStatusColor = (status: OrderStatus) => {
        switch(status) {
            case 'preparing': return 'bg-amber-500';
            case 'ready': return 'bg-green-500';
            default: return 'bg-blue-500';
        }
    };

    const renderItem = (item: CartItem, idx: number) => (
        <div key={`${item.id}-${idx}`} className="space-y-1.5 py-2">
            <div className="flex justify-between items-start gap-2">
                <div className="flex gap-3">
                    <span className={`w-7 h-7 rounded-lg ${isDark ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'} flex items-center justify-center font-black text-sm shrink-0 border ${borderColor}`}>
                        {item.quantity}
                    </span>
                    <p className={`font-bold text-base ${textColor} leading-tight`}>{item.name}</p>
                </div>
            </div>
            {item.selectedAddons && item.selectedAddons.length > 0 && (
                <div className="ml-10 flex flex-wrap gap-1">
                    {item.selectedAddons.map(a => (
                        <span key={a.id} className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${isDark ? 'border-gray-600 bg-gray-700 text-amber-400' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
                            + {a.name}
                        </span>
                    ))}
                </div>
            )}
            {item.note && (
                <div className={`ml-10 p-2.5 rounded-2xl border border-dashed ${isDark ? 'border-blue-900 bg-blue-950/20' : 'border-blue-100 bg-blue-50'} flex gap-2 items-start shadow-inner`}>
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500 mt-1 flex-shrink-0" />
                    <p className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'} italic leading-snug`}>{item.note}</p>
                </div>
            )}
        </div>
    );

    const stations: { id: Station, label: string, icon: any }[] = [
        { id: 'kitchen', label: 'Kitchen Prep', icon: Utensils },
        { id: 'drinks', label: 'Drink Prep', icon: Coffee },
        { id: 'bakery', label: 'Bakery Prep', icon: Croissant },
        { id: 'all', label: 'Master View', icon: LayoutGrid }
    ];

    return (
        <div className={`h-full flex flex-col ${backgroundColor} overflow-hidden`}>
            <header className={`${cardBg} border-b ${borderColor} p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md z-10`}>
                <div className="flex items-center gap-3">
                    <ChefHat className={`w-8 h-8 text-${themeColor}-600`} />
                    <h1 className={`text-2xl font-black ${textColor}`}>Station Management</h1>
                </div>

                <div className="flex bg-gray-200/50 p-1.5 rounded-2xl border border-gray-200/20 gap-1">
                    {stations.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveStation(s.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeStation === s.id ? `bg-${themeColor}-600 text-white shadow-lg` : `${mutedText} hover:bg-white/10`}`}
                        >
                            <s.icon className="w-4 h-4" />
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className={`hidden lg:flex px-5 py-2 rounded-full ${isDark ? 'bg-gray-700 text-gray-100' : `bg-${themeColor}-100 text-${themeColor}-700`} font-black text-sm border ${borderColor}`}>
                    {filteredOrders.length} Tickets Pending
                </div>
            </header>

            <main className="flex-1 overflow-x-auto p-6 scrollbar-hide">
                {filteredOrders.length === 0 ? (
                    <div className={`h-full flex flex-col items-center justify-center opacity-30 ${textColor}`}>
                        <ChefHat className="w-32 h-32 mb-4" />
                        <h2 className="text-3xl font-black">All Done for this Station!</h2>
                        <p className="font-bold uppercase tracking-widest mt-2">Check other stations or wait for new orders</p>
                    </div>
                ) : (
                    <div className="flex gap-6 h-full pb-4">
                        {filteredOrders.map(order => {
                            const stationItems = getStationItems(order.items, activeStation);
                            const currentStationStatus = activeStation === 'all' ? order.status : (order.stationStatuses?.[activeStation] || 'pending');

                            return (
                                <div key={order.id} className={`${cardBg} w-96 flex-shrink-0 rounded-[40px] border-2 ${borderColor} shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300`}>
                                    {/* Ticket Header */}
                                    <div className={`${getStatusColor(currentStationStatus)} p-6 text-white relative`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-5xl font-black">#{order.ticketNumber}</span>
                                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                                <Clock className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 font-black text-lg opacity-95">
                                            <User className="w-5 h-5" />
                                            <span className="truncate">{order.customerName}</span>
                                        </div>
                                        {order.tableNumber && (
                                            <div className="absolute top-1/2 right-6 -translate-y-1/2 bg-white/20 px-4 py-2 rounded-2xl font-black text-sm uppercase flex items-center gap-2 border border-white/30 backdrop-blur-sm shadow-sm">
                                                <MapPin className="w-4 h-4" /> {order.tableNumber}
                                            </div>
                                        )}
                                        <div className="text-xs uppercase tracking-tight opacity-70 mt-2 font-black">
                                            Ordered {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    {/* Station Status Indicators (if Master View) */}
                                    {activeStation === 'all' && order.stationStatuses && (
                                        <div className={`px-6 py-3 border-b ${borderColor} flex gap-3 ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                            {Object.entries(order.stationStatuses).map(([sid, stat]) => (
                                                <div key={sid} className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${stat === 'ready' ? 'bg-green-500' : stat === 'preparing' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${mutedText}`}>{sid}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Items List */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                        {activeStation === 'all' ? (
                                            <>
                                                {/* Grouped Master View */}
                                                {['kitchen', 'drinks', 'bakery'].map(sid => {
                                                    const items = getStationItems(order.items, sid as Station);
                                                    if (items.length === 0) return null;
                                                    return (
                                                        <div key={sid} className="mb-6 last:mb-0">
                                                            <div className={`flex items-center justify-between mb-3 pb-1.5 border-b ${borderColor}`}>
                                                                <div className="flex items-center gap-2">
                                                                    {sid === 'drinks' ? <Coffee className="w-4 h-4 text-blue-500" /> : sid === 'bakery' ? <Croissant className="w-4 h-4 text-amber-600" /> : <Utensils className="w-4 h-4 text-red-500" />}
                                                                    <span className={`text-xs font-black uppercase tracking-widest ${mutedText}`}>{sid}</span>
                                                                </div>
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${order.stationStatuses?.[sid] === 'ready' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                    {order.stationStatuses?.[sid] || 'pending'}
                                                                </span>
                                                            </div>
                                                            <div className="divide-y divide-gray-100/10">
                                                                {items.map((item, idx) => renderItem(item, idx))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <div className="divide-y divide-gray-100/10">
                                                {stationItems.map((item, idx) => renderItem(item, idx))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Actions per Station */}
                                    <div className={`p-6 border-t ${borderColor} ${isDark ? 'bg-gray-800/40' : 'bg-gray-50/50'}`}>
                                        {activeStation === 'all' ? (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onUpdateStatus(order.id, 'completed')}
                                                    className="flex-1 py-4 bg-gray-900 text-white rounded-[24px] font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                                                >
                                                    Archive Ticket
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {currentStationStatus === 'pending' && (
                                                    <button 
                                                        onClick={() => onUpdateStatus(order.id, 'preparing', activeStation)}
                                                        className="w-full py-5 bg-amber-500 text-white rounded-[24px] font-black shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-lg"
                                                    >
                                                        <ChefHat className="w-6 h-6" /> Start Preparing
                                                    </button>
                                                )}
                                                {currentStationStatus === 'preparing' && (
                                                    <button 
                                                        onClick={() => onUpdateStatus(order.id, 'ready', activeStation)}
                                                        className="w-full py-5 bg-green-500 text-white rounded-[24px] font-black shadow-xl shadow-green-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-lg"
                                                    >
                                                        <CheckCircle className="w-6 h-6" /> Station Ready
                                                    </button>
                                                )}
                                                {currentStationStatus === 'ready' && (
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center gap-2 text-green-500 font-black uppercase tracking-widest text-sm py-2">
                                                            <CheckCircle className="w-5 h-5" /> Completed at this Station
                                                        </div>
                                                        <button 
                                                            onClick={() => onUpdateStatus(order.id, 'preparing', activeStation)}
                                                            className={`mt-2 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${mutedText} hover:text-amber-500 transition-colors bg-white/50 px-3 py-1 rounded-full border ${borderColor}`}
                                                        >
                                                            <RotateCcw className="w-3 h-3" /> Still Working?
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default KitchenView;

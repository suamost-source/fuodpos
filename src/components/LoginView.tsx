
import React, { useState } from 'react';
import { User, ShopSettings } from '../types';
import { loadUsers } from '../services/storageService';
import { getTranslation } from '../utils/translations';
import { Lock, User as UserIcon, Eye, EyeOff, ChevronRight } from 'lucide-react';

interface LoginViewProps {
    onLogin: (user: User) => void;
    settings: ShopSettings;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, settings }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    
    const t = (key: any) => getTranslation(settings.language, key);

    const { themeColor, backgroundColor, inputDensity } = settings.appearance;
    const inputBackground = settings.appearance.inputBackground || 'bg-white';
    // Ensure we have a valid text color class
    const textColor = settings.appearance.textColor || 'text-gray-800';

    // Density Styles
    const containerPadding = inputDensity === 'compact' ? 'p-6' : 'p-8';
    const inputPy = inputDensity === 'compact' ? 'py-2' : 'py-3';
    const buttonPy = inputDensity === 'compact' ? 'py-2.5' : 'py-3.5';
    const spaceY = inputDensity === 'compact' ? 'space-y-3' : 'space-y-5';

    // Destructure login settings, providing defaults for safety
    const { 
        customLogo, 
        backgroundImage, 
        welcomeMessage = t('welcome'), 
        showStoreName = true 
    } = settings.loginScreen || {};

    // Determine if we are likely in a dark mode based on input background or page background
    const isDarkMode = inputBackground.includes('800') || inputBackground.includes('900') || backgroundColor.includes('900');
    // If a background image is used, we usually want a solid or semi-transparent card. 
    // If backgroundImage exists, default to white/glass card unless dark mode is explicit
    const cardBackground = isDarkMode 
        ? 'bg-gray-900/90 border border-gray-700 backdrop-blur-md' 
        : backgroundImage 
            ? 'bg-white/95 border border-gray-200 backdrop-blur-md' 
            : 'bg-white border border-gray-100';
            
    const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const users = loadUsers();
        // Simple case-insensitive username match, strict password match
        const user = users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.password === password
        );
        
        if (user) {
            onLogin(user);
        } else {
            setError(t('error'));
            setPassword('');
        }
    };

    const containerStyle = backgroundImage 
        ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
        : {};

    return (
        <div 
            className={`flex items-center justify-center h-screen ${!backgroundImage ? backgroundColor : ''} p-4 relative`}
            style={containerStyle}
        >
            {/* Overlay if background image exists to ensure contrast */}
            {backgroundImage && <div className="absolute inset-0 bg-black/40" />}

            <div className={`${cardBackground} rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full animate-in fade-in zoom-in duration-300 relative z-10`}>
                
                <div className={`${containerPadding} text-center border-b border-gray-100/10`}>
                    {customLogo ? (
                        <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                            <img src={customLogo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className={`w-16 h-16 bg-${themeColor}-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                            <Lock className="w-8 h-8" />
                        </div>
                    )}
                    
                    {showStoreName !== false && (
                        <h2 className={`text-2xl font-bold ${textColor}`}>{settings.shopName || 'SwiftPOS'}</h2>
                    )}
                    <p className={`opacity-80 text-sm mt-1 ${textColor}`}>{welcomeMessage}</p>
                </div>

                <div className={`${containerPadding} pt-4`}>
                    <form onSubmit={handleLogin} className={spaceY}>
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center border border-red-100 animate-pulse font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className={`text-xs font-bold uppercase tracking-wide ml-1 opacity-70 ${textColor}`}>{t('username')}</label>
                            <div className="relative">
                                <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 ${textColor}`} />
                                <input 
                                    type="text"
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        setError('');
                                    }}
                                    className={`w-full pl-10 pr-4 ${inputPy} border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none transition-all ${inputBackground} ${textColor}`}
                                    placeholder={t('username')}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className={`text-xs font-bold uppercase tracking-wide ml-1 opacity-70 ${textColor}`}>{t('password')}</label>
                            <div className="relative">
                                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 ${textColor}`} />
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    className={`w-full pl-10 pr-10 ${inputPy} border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none transition-all ${inputBackground} ${textColor}`}
                                    placeholder={t('password')}
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-100 opacity-50 ${textColor}`}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`w-full ${buttonPy} bg-${themeColor}-600 text-white rounded-xl font-bold shadow-lg hover:bg-${themeColor}-700 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-2`}
                        >
                            <span>{t('signIn')}</span>
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </form>
                    
                    <div className={`mt-6 text-center border-t border-gray-100/10 pt-4 ${subTextColor}`}>
                        <p className="text-xs">Default Admin: admin / password</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;

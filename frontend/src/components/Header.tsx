import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
    title: string;
    subtitle?: string;
    pendingNotifications?: number;
    onMenuClick?: () => void;
}

export default function Header({
    title,
    subtitle,
    pendingNotifications = 0,
    onMenuClick,
}: HeaderProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-lg border-b border-white/5">
            <div className="flex items-center justify-between px-6 py-4">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    {onMenuClick && (
                        <button
                            onClick={onMenuClick}
                            className="lg:hidden p-2 rounded-lg hover:bg-white/5"
                        >
                            <Menu className="w-5 h-5 text-gray-300" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-white">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm text-gray-400">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="hidden md:block relative">
                        <input
                            type="text"
                            placeholder="Buscar leads, produtos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64 pl-10 pr-4 py-2 rounded-xl bg-dark-800/50 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 transition-all"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </form>

                    {/* Notifications */}
                    <button
                        onClick={() => navigate('/notifications')}
                        className="relative p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <Bell className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                        {pendingNotifications > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                {pendingNotifications > 9 ? '9+' : pendingNotifications}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}

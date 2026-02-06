import React, { useEffect, useState } from 'react';
import { Sun, Moon, Bell, Search } from 'lucide-react';

const Header = ({ title }) => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            setIsDark(true);
        } else {
            document.documentElement.classList.remove('dark');
            setIsDark(false);
        }
    }, []);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            setIsDark(true);
        }
    };

    return (
        <header className="h-16 bg-white dark:bg-dark-card border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 transition-colors duration-300">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white border-l-4 border-primary pl-3">
                {title}
            </h2>

            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-9 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 border-none focus:ring-2 focus:ring-primary/50 text-sm w-64 dark:text-white"
                    />
                </div>

                <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </button>

                <button
                    onClick={toggleTheme}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    {isDark ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>
        </header>
    );
};

export default Header;

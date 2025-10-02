import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>(() => {
		if (typeof window !== 'undefined') {
			return (localStorage.getItem('theme') as Theme) || 'system';
		}
		return 'system';
	});

	const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

	useEffect(() => {
		const root = window.document.documentElement;
		
		const updateTheme = () => {
			if (theme === 'system') {
				const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
				setActualTheme(systemTheme);
				root.classList.toggle('dark', systemTheme === 'dark');
			} else {
				setActualTheme(theme);
				root.classList.toggle('dark', theme === 'dark');
			}
		};

		updateTheme();
		localStorage.setItem('theme', theme);

		if (theme === 'system') {
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addListener(updateTheme);
			return () => mediaQuery.removeListener(updateTheme);
		}
	}, [theme]);

	return (
		<ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}

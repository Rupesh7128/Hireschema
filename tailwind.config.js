/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./api/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Geist Sans', 'Inter', 'sans-serif'],
                mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
            },
            colors: {
                orange: {
                    450: '#F97316',
                    500: '#F97316',
                    550: '#EA580C',
                    600: '#EA580C',
                    700: '#C2410C',
                    800: '#9A3412',
                    900: '#7C2D12',
                    950: '#431407',
                },
                zinc: {
                    850: '#202022',
                    900: '#18181B',
                    950: '#09090B',
                }
            },
            animation: {
                marquee: 'marquee 20s linear infinite',
                'scan': 'scan 2s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'grid-flow': 'grid-flow 20s linear infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                scan: {
                    '0%, 100%': { top: '0%' },
                    '50%': { top: '100%' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
                'grid-flow': {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '50px 50px' },
                }
            }
        }
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}

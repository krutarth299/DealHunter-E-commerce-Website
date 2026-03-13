/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#2563eb', // Standard Blue (Trustworthy)
                secondary: '#f3f4f6', // Light Gray Background
                accent: '#f59e0b', // Amber for stars/highlights
                text: {
                    primary: '#1f2937', // Gray 800
                    secondary: '#6b7280', // Gray 500
                },
                white: '#ffffff',
                border: '#e5e7eb', // Gray 200
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            container: {
                center: true,
                padding: '1rem',
            }
        },
    },
    plugins: [],
}

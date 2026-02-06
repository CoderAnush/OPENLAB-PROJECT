/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: "#0EA5E9", // Sky 500
                secondary: "#64748B",
                danger: "#EF4444",
                warning: "#F59E0B",
                success: "#10B981",
                dark: {
                    bg: "#0F172A", // Slate 900
                    card: "#1E293B", // Slate 800
                    text: "#F8FAFC"
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}

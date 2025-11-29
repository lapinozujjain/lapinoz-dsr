/** @type {import('tailwindcss').Config} */
export default {
  // CRITICAL: Tells Tailwind where to look for CSS classes (in index.html and all files in src/)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {
      // You can add custom colors, fonts, etc., here later if needed
    },
  },
  plugins: [],
}
// tailwind.config.js
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // your dracula-like palette or custom colors
        draculaBg: '#282a36',
        draculaCurrent: '#44475a',
        draculaCyan: '#8be9fd',
        draculaGreen: '#50fa7b',
        draculaOrange: '#ffb86c',
        draculaPink: '#ff79c6',
        draculaPurple: '#bd93f9',
        draculaYellow: '#f1fa8c',
      },
    },
  },
  plugins: [],
}
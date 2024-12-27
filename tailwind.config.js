// tailwind.config.js
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // or 'media'
  theme: {
    extend: {
      colors: {
        myDark: 'rgb(30,31,41)',
        myLight: 'rgb(224,226,240)',
        myBorder: 'rgb(63,66,87)',
        myAccent1: 'rgb(139,233,253)',
        myAccent2: 'rgb(80,250,123)',
        myAccent3: 'rgb(189,147,249)',
        myAccent4: 'rgb(255,121,198)', // trailing comma is okay in JS, but ensure the curly braces match
      }, // <-- Make sure this curly brace closes the "colors" object
    },   // <-- Make sure this closes the "extend" object
  },
  plugins: [],
};

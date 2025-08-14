/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",          // include main html
    "./src/**/*.{js,jsx}",   // all your React components
  ],
  theme: {
    extend: {
      colors: {
        pwcOrange: "#E87722",
        pwcRed: "#DA291C",
        pwcPink: "#EC5990",
        pwcYellow: "#F2A900",
        pwcGray: "#2D2A26",
      },
    },
  },
  plugins: [],
};
    
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        pink: '#f02e65',
        'pink-light': '#fef8fa'
      }
    },
  },
  plugins: [],
}

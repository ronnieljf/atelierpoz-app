import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f2',
          100: '#fce6e6',
          200: '#f9d0d0',
          300: '#f4a8a8',
          400: '#ed7777',
          500: '#e14d4d',
          600: '#c92f2f',
          700: '#a82525',
          800: '#8b2222',
          900: '#722F37',
          950: '#4a1a1a',
        },
        secondary: {
          50: '#faf5f0',
          100: '#f3e8d8',
          200: '#e6d0b0',
          300: '#d6b17e',
          400: '#c48d4d',
          500: '#b8752e',
          600: '#a85f24',
          700: '#8b4a1f',
          800: '#723d1e',
          900: '#5e331b',
          950: '#32190d',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
    },
  },
  plugins: [],
};

export default config;

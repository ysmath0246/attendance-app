// postcss.config.cjs
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},  // ✅ 반드시 이 라인으로 변경해야 합니다!
    autoprefixer: {},
  },
};

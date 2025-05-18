// postcss.config.js
module.exports = {
  plugins: {
    // Tailwind CSS용 PostCSS 플러그인을 분리해서 설치한 이름으로 사용
    '@tailwindcss/postcss': {},
    // (필요하다면) Autoprefixer
    autoprefixer: {},
  }
}

const fs = require('fs');
let txt = fs.readFileSync('ogrenci-panel.html', 'utf8');

const codeToAppend = `
<script>
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const modal = urlParams.get('modal');
  if (modal === 'shop') {
    setTimeout(() => { if (typeof openShopModal === 'function') openShopModal(); }, 500);
  } else if (modal === 'avatar') {
    setTimeout(() => { if (typeof openAvatarModal === 'function') openAvatarModal(); }, 500);
  }
});
</script>
`;

if (!txt.includes('urlParams.get(\'modal\')')) {
  txt = txt.replace('</body>', codeToAppend + '\n</body>');
  fs.writeFileSync('ogrenci-panel.html', txt, 'utf8');
  console.log('Appended query param logic to ogrenci-panel.html');
}

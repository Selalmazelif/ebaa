const searchBtn = document.querySelector('.search button');
const searchInput = document.querySelector('.search input');

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if(query) {
        alert(`Arama: ${query}`);
        console.log('Aranan:', query);
    } else {
        alert('Lütfen bir arama terimi girin.');
    }
});

searchInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') searchBtn.click();
});
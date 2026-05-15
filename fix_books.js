const fs = require('fs');

const file = 'c:\\Users\\elifs\\OneDrive\\Desktop\\Yeni klasör\\kitaplar.html';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Amazon image linklerini dummyimage ile değiştir
  content = content.replace(/https:\/\/m\.media-amazon\.com\/images\/I\/51rY8Z\+8T1L\._SY344_BO1,204,203,200_\.jpg/g, 'https://dummyimage.com/300x400/284B63/ffffff.png&text=Sefiller');
  content = content.replace(/https:\/\/m\.media-amazon\.com\/images\/I\/41Z-mndfVzL\._SY344_BO1,204,203,200_\.jpg/g, 'https://dummyimage.com/300x400/284B63/ffffff.png&text=Suc+ve+Ceza');
  content = content.replace(/https:\/\/m\.media-amazon\.com\/images\/I\/41aM4xOZxaL\._SY344_BO1,204,203,200_\.jpg/g, 'https://dummyimage.com/300x400/284B63/ffffff.png&text=1984');
  content = content.replace(/https:\/\/m\.media-amazon\.com\/images\/I\/51y1Ww1yC0L\._SY344_BO1,204,203,200_\.jpg/g, 'https://dummyimage.com/300x400/284B63/ffffff.png&text=Simyaci');
  content = content.replace(/https:\/\/m\.media-amazon\.com\/images\/I\/41O\+nQkI9TL\._SY344_BO1,204,203,200_\.jpg/g, 'https://dummyimage.com/300x400/284B63/ffffff.png&text=Nutuk');
  content = content.replace(/https:\/\/m\.media-amazon\.com\/images\/I\/41SgR7-oO3L\._SY344_BO1,204,203,200_\.jpg/g, 'https://dummyimage.com/300x400/284B63/ffffff.png&text=Kucuk+Prens');

  fs.writeFileSync(file, content, 'utf8');
  console.log("Kitap resimleri DummyImage ile güncellendi.");
}

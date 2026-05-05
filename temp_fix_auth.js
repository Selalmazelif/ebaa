const fs = require('fs');
let txt = fs.readFileSync('auth-utils.js', 'utf8');

const replacement = `      if ((data.points || 0) >= 100) {
        const btnContainer = document.getElementById('cert-btn-container');
        if (btnContainer) btnContainer.style.display = 'block';
      }
    }
    
    // Rozetleri yükle
    const rBadge = await ebaFetch('/api/user-badges?tc=' + user.tc);
    if (rBadge) {
      const dBadge = await rBadge.json();
      const container = document.getElementById('user-badges-container');
      if (container && dBadge.success && dBadge.badges.length) {
        container.innerHTML = dBadge.badges.map(b => \`
          <div title="\${b.name}: \${b.description}" style="width:28px; height:28px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 4px rgba(0,0,0,0.1); cursor:help;">
            <i class="fa \${b.icon}" style="color:#f39200; font-size:12px;"></i>
          </div>
        \`).join('');
      } else if (container) {
        container.innerHTML = '<span style="font-size:10px; color:rgba(255,255,255,0.4);">Henüz rozet yok</span>';
      }
    }
  } catch(e) {}`;

txt = txt.replace('    }\r\n  } catch(e) {}', replacement);
txt = txt.replace('    }\n  } catch(e) {}', replacement);

fs.writeFileSync('auth-utils.js', txt, 'utf8');
console.log('Fixed auth-utils.js');

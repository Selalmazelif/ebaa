const loginForm = document.getElementById("loginForm");

// Güvenlik: Login attempt throttling
let loginAttempts = {};
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 dakika

function getClientId() {
  // Client ID'yi generate et (session için)
  let clientId = sessionStorage.getItem('clientId');
  if (!clientId) {
    clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('clientId', clientId);
  }
  return clientId;
}

function isLockedOut() {
  const clientId = getClientId();
  const attempt = loginAttempts[clientId];
  
  if (!attempt) return false;
  
  if (attempt.count >= MAX_ATTEMPTS) {
    const now = Date.now();
    if (now - attempt.timestamp < LOCKOUT_TIME) {
      const remainingTime = Math.ceil((LOCKOUT_TIME - (now - attempt.timestamp)) / 1000);
      return remainingTime;
    } else {
      // Lockout süresi doldu, sıfırla
      delete loginAttempts[clientId];
      return false;
    }
  }
  
  return false;
}

function recordFailedAttempt() {
  const clientId = getClientId();
  const now = Date.now();
  
  if (!loginAttempts[clientId]) {
    loginAttempts[clientId] = { count: 0, timestamp: now };
  }
  
  loginAttempts[clientId].count++;
  loginAttempts[clientId].timestamp = now;
}

function resetLoginAttempts() {
  const clientId = getClientId();
  delete loginAttempts[clientId];
}

function redirectByRole(user) {
    if (user.role === "ogrenci") return "ogrenci-panel.html";
    if (user.role === "ogretmen") return "ogretmen-panel.html";
    if (user.role === "veli") return "veli-panel.html";
    return "ogrenci-panel.html";
}

if (localStorage.getItem("authToken") && localStorage.getItem("currentUser")) {
    try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        const token = localStorage.getItem("authToken");
        if (currentUser && currentUser.id && currentUser.tc && currentUser.role && currentUser.token === token) {
            window.location.href = redirectByRole(currentUser);
        } else {
            localStorage.removeItem("currentUser");
            localStorage.removeItem("authToken");
        }
    } catch (e) {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("authToken");
    }
}

if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        // Güvenlik: Lockout kontrolü
        const lockedOutTime = isLockedOut();
        if (lockedOutTime) {
            alert("Çok fazla başarısız giriş denemesi. Lütfen " + lockedOutTime + " saniye sonra tekrar deneyin.");
            return;
        }

        let tc = document.getElementById("tc").value.trim();
        let password = document.getElementById("password").value;

        if (!tc || !password) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }

        // Güvenlik: Basic input validation
        if (!/^\d{11}$/.test(tc)) {
            recordFailedAttempt();
            alert("Geçersiz giriş bilgileri");
            return;
        }

        let users = JSON.parse(localStorage.getItem("users")) || [];

        let user = users.find(u => u.tc === tc && u.password === password);

        if (user) {
            resetLoginAttempts();
            
            const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const secureUser = {
                id: user.id,
                name: user.name,
                tc: user.tc,
                role: user.role,
                school: user.school,
                class: user.class,
                authorizedClasses: user.authorizedClasses,
                profilePic: user.profilePic,
                loginTime: Date.now(),
                token: token
            };
            
            localStorage.setItem("authToken", token);
            localStorage.setItem("currentUser", JSON.stringify(secureUser));
            sessionStorage.removeItem("currentUser");
            sessionStorage.removeItem("tabId");
            
            alert("Giriş başarılı!");
            window.location.href = redirectByRole(user);
        } else {
            recordFailedAttempt();
            // Güvenlik: Genel hata mesajı (TC mi şifre mi yanlış olduğunu söyleme)
            alert("Geçersiz giriş bilgileri");
        }
    });
}


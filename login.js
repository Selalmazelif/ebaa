document.getElementById("loginForm").addEventListener("submit", function(e){
    e.preventDefault();

    let tc = document.getElementById("tc").value;
    let password = document.getElementById("password").value;

    let users = JSON.parse(localStorage.getItem("users")) || [];

    let user = users.find(u => u.tc === tc && u.password === password);

    if(user){

        alert("Giriş başarılı");

        // rolüne göre panel aç
        if(user.role === "ogrenci"){
            window.location.href = "ogrenci-panel.html";
        }

        else if(user.role === "ogretmen"){
            window.location.href = "ogretmen-panel.html";
        }

        else if(user.role === "veli"){
            window.location.href = "veli-panel.html";
        }

    } else {
        alert("TC veya şifre yanlış");
    }
});


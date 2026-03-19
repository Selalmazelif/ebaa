const banner = document.getElementById("bannerSlider");
const slides = banner.querySelectorAll("img");
let index = 0;

banner.style.display = "flex";
banner.style.transition = "transform 0.5s ease-in-out";

setInterval(() => {
    index = (index + 1) % slides.length;
    banner.style.transform = `translateX(-${index * 100}%)`;
}, 4000);
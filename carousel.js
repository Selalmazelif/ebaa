const banner = document.getElementById("bannerSlider");
const slides = banner ? banner.querySelectorAll("img") : [];
let index = 0;
let autoPlayInterval;

if (banner && slides.length > 0) {
    banner.style.display = "flex";
    banner.style.transition = "transform 0.5s ease-in-out";

    function updateSlide() {
        banner.style.transform = `translateX(-${index * 100}%)`;
    }

    window.moveSlide = function(step) {
        index += step;
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        updateSlide();
        resetAutoPlay();
    };

    function startAutoPlay() {
        autoPlayInterval = setInterval(() => {
            index = (index + 1) % slides.length;
            updateSlide();
        }, 4000);
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    startAutoPlay();
}
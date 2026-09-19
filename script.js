const sideMenu = document.querySelector("#side-menu");
const naviTab = document.querySelector("#navi-tab");
const openZoneWidth = 28;
const menuWidth = 240;

function setMenuOpen(isOpen) {
    document.body.classList.toggle("menu-open", isOpen);
    sideMenu.classList.toggle("is-open", isOpen);
    sideMenu.setAttribute("aria-hidden", String(!isOpen));
    naviTab.setAttribute("aria-expanded", String(isOpen));
}

document.addEventListener("mousemove", (event) => {
    if (event.clientX <= openZoneWidth) {
        setMenuOpen(true);
        return;
    }

    const cursorIsOutsideMenu = event.clientX > menuWidth;
    const cursorIsOutsideTab = !naviTab.matches(":hover");

    if (cursorIsOutsideMenu && cursorIsOutsideTab) {
        setMenuOpen(false);
    }
});

naviTab.addEventListener("click", () => {
    setMenuOpen(!sideMenu.classList.contains("is-open"));
});

document.addEventListener("mouseleave", () => {
    setMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setMenuOpen(false);
    }
});

const audioPlayer = document.querySelector("#audio-player");
const songCards = document.querySelectorAll(".song-card");
let activeSongCard = null;

function setActiveSongCard(card) {
    songCards.forEach((songCard) => {
        const isActive = songCard === card;
        songCard.classList.toggle("is-playing", isActive);
        songCard.setAttribute("aria-pressed", String(isActive));
    });

    activeSongCard = card;
}

songCards.forEach((songCard) => {
    songCard.addEventListener("click", async () => {
        const requestedAudioUrl = new URL(songCard.dataset.audio, document.baseURI).href;
        const sameSongIsPlaying = audioPlayer.src === requestedAudioUrl && !audioPlayer.paused;

        if (sameSongIsPlaying) {
            audioPlayer.pause();
            setActiveSongCard(null);
            return;
        }

        if (audioPlayer.src !== requestedAudioUrl) {
            audioPlayer.src = requestedAudioUrl;
        }

        try {
            await audioPlayer.play();
            setActiveSongCard(songCard);
        } catch (error) {
            setActiveSongCard(null);
            console.error("The song could not be played:", error);
        }
    });
});

audioPlayer.addEventListener("ended", () => {
    setActiveSongCard(null);
});

const sideMenu = document.querySelector("#side-menu");
const leftEdgeWidth = 220;

document.addEventListener("mousemove", (event) => {
    sideMenu.hidden = event.clientX > leftEdgeWidth;
});

document.addEventListener("mouseleave", () => {
    sideMenu.hidden = true;
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        sideMenu.hidden = true;
    }
});

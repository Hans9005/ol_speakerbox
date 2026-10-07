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
let activeSongCard = null;

function setActiveSongCard(card) {
    document.querySelectorAll(".song-card").forEach((songCard) => {
        const isActive = songCard === card;
        songCard.classList.toggle("is-playing", isActive);
        songCard.setAttribute("aria-pressed", String(isActive));
    });

    activeSongCard = card;
}

document.addEventListener("click", async (event) => {
    const songCard = event.target.closest(".song-card");
    if (songCard) {
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
    }
});

audioPlayer.addEventListener("ended", () => {
    setActiveSongCard(null);
});

const accountsKey = "speakerbox-accounts";
const activeUserKey = "speakerbox-active-user";
const loginButton = document.querySelector("#log");
const signupButton = document.querySelector("#Signup");
const logoutButton = document.querySelector("#logout");
const profileName = document.querySelector("#guest");
let accounts;

try {
    const saved = JSON.parse(localStorage.getItem(accountsKey) || "[]");
    accounts = Array.isArray(saved)
        ? saved.filter((account) => account && typeof account.id === "string" && typeof account.username === "string" && typeof account.salt === "string" && typeof account.hash === "string")
        : [];
} catch {
    accounts = [];
}

function renderAuth() {
    const account = accounts.find((item) => item.id === localStorage.getItem(activeUserKey));
    profileName.textContent = account ? account.username : "Guest";
    loginButton.hidden = Boolean(account);
    signupButton.hidden = Boolean(account);
    logoutButton.hidden = !account;
}

function toHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, saltHex) {
    if (!crypto.subtle) throw new Error("Open the site through a local server to use accounts.");
    const salt = Uint8Array.from(saltHex.match(/.{2}/g), (byte) => parseInt(byte, 16));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, key, 256);
    return toHex(new Uint8Array(bits));
}

const authDialog = document.createElement("dialog");
authDialog.className = "auth-dialog";
authDialog.innerHTML = `
    <form id="auth-form">
        <div class="auth-heading">
            <h2 id="auth-title"></h2>
            <button id="auth-close" type="button" aria-label="Close">×</button>
        </div>
        <label for="auth-username">Username</label>
        <input id="auth-username" name="username" type="text" minlength="3" maxlength="32" autocomplete="username" required>
        <label for="auth-password">Password</label>
        <input id="auth-password" name="password" type="password" minlength="8" required>
        <div id="auth-confirm-wrap">
            <label for="auth-confirm">Confirm password</label>
            <input id="auth-confirm" name="confirm" type="password" minlength="8" autocomplete="new-password" required>
        </div>
        <p id="auth-error" role="alert"></p>
        <button id="auth-submit" type="submit"></button>
    </form>`;
document.body.append(authDialog);

const authForm = authDialog.querySelector("#auth-form");
const authTitle = authDialog.querySelector("#auth-title");
const authUsername = authDialog.querySelector("#auth-username");
const authPassword = authDialog.querySelector("#auth-password");
const authConfirm = authDialog.querySelector("#auth-confirm");
const authConfirmWrap = authDialog.querySelector("#auth-confirm-wrap");
const authError = authDialog.querySelector("#auth-error");
const authSubmit = authDialog.querySelector("#auth-submit");
let authMode = "login";

function openAuth(mode) {
    authMode = mode;
    authForm.reset();
    authError.textContent = "";
    const registering = mode === "signup";
    authTitle.textContent = registering ? "Sign up" : "Login";
    authSubmit.textContent = registering ? "Create account" : "Log in";
    authPassword.autocomplete = registering ? "new-password" : "current-password";
    authPassword.minLength = registering ? 8 : 1;
    authConfirmWrap.hidden = !registering;
    authConfirm.disabled = !registering;
    authDialog.showModal();
    authUsername.focus();
}

signupButton.addEventListener("click", () => openAuth("signup"));
loginButton.addEventListener("click", () => openAuth("login"));
logoutButton.addEventListener("click", () => {
    localStorage.removeItem(activeUserKey);
    renderAuth();
});
authDialog.querySelector("#auth-close").addEventListener("click", () => authDialog.close());
authDialog.addEventListener("click", (event) => {
    if (event.target === authDialog) authDialog.close();
});

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = authUsername.value.trim();
    const password = authPassword.value;
    authError.textContent = "";
    if (username.length < 3) {
        authError.textContent = "Username must have at least 3 characters.";
        return;
    }
    authSubmit.disabled = true;
    try {
        if (authMode === "signup") {
            if (password !== authConfirm.value) {
                authError.textContent = "Passwords do not match.";
                return;
            }
            if (accounts.some((account) => account.username.toLowerCase() === username.toLowerCase())) {
                authError.textContent = "This username is already taken.";
                return;
            }
            const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
            const account = { id: crypto.randomUUID(), username, salt, hash: await hashPassword(password, salt) };
            localStorage.setItem(accountsKey, JSON.stringify([...accounts, account]));
            accounts.push(account);
            localStorage.setItem(activeUserKey, account.id);
        } else {
            const account = accounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
            if (!account || await hashPassword(password, account.salt) !== account.hash) {
                authError.textContent = "Incorrect username or password.";
                return;
            }
            localStorage.setItem(activeUserKey, account.id);
        }
        renderAuth();
        authDialog.close();
    } catch (error) {
        authError.textContent = error.name === "QuotaExceededError"
            ? "Browser storage is full. Account could not be saved."
            : error.message;
    } finally {
        authSubmit.disabled = false;
    }
});

renderAuth();

document.querySelector("#Supp").addEventListener("click", () => {
    window.alert("Все в руках ваших рук.");
});

let playlistView = document.querySelector("#playlist-view");
let homeView = document.querySelector("#home-view");
let exploreView = document.querySelector("#explore-view");
const sidebarPlaylists = document.querySelector("#sidebar-playlists");
const storageKey = "speakerbox-playlists";
let playlists;

const mwAudioFiles = [
    "T.I. Presents The P$C - Do ya Thang.mp3",
    "Rock - I Am Rock.mp3",
    "Styles of Beyond - Nine Thou.mp3",
    "Suni Clay - In a Hood Near You.mp3",
    "need_for_speed_most_wanted_05 - The Perceptionists - Let's Move.mp3",
    "need_for_speed_most_wanted_06 - Juvenile - Sets Go Up.mp3",
    "need_for_speed_most_wanted_07 - Hush-Fired up.mp3",
    "need_for_speed_most_wanted_08 - DJ Spooky and Dave Lombardo - B-Side Wins Again feat. Chuck D.mp3",
    "need_for_speed_most_wanted_09 - Celldweller feat. Styles Of Beyond - Shapeshifter.mp3",
    "need_for_speed_most_wanted_10 - Lupe Fiasco - Tilted.mp3",
    "need_for_speed_most_wanted_11 - Ils - Feed The Addiction.mp3",
    "need_for_speed_most_wanted_12 - Celldweller - One Good Reason.mp3",
    "need_for_speed_most_wanted_13 - Hyper - We Contro.mp3",
    "need_for_speed_most_wanted_14 - Static-X - Skinnyman.mp3",
    "need_for_speed_most_wanted_15 - Diesel Boy + Kaos - Barrier Break.mp3",
    "need_for_speed_most_wanted_16 - Disturbed - Decadence.mp3",
    "need_for_speed_most_wanted_17 - The Prodigy - You'll Be Under My Wheels.mp3",
    "need_for_speed_most_wanted_18 - The Roots and BT - Tao Of The Machine (Scott Humphrey's Remix).mp3",
    "need_for_speed_most_wanted_19 - Stratus - You Must Follow (Evol Intent VIP).mp3",
    "need_for_speed_most_wanted_20 - Mastodon - Blood And Thunder.mp3",
    "need_for_speed_most_wanted_21 - Evol Intent. Mayhem & Thinktank - Broken Sword.mp3",
    "need_for_speed_most_wanted_22 - Bullet For My Valentine - Hand Of Blood.mp3"
];
const mwPlaylist = {
    id: "mw",
    name: "Need for Speed: Most Wanted",
    image: "images/MW.jpg",
    songs: mwAudioFiles.map((filename) => {
        const label = filename.replace(/^need_for_speed_most_wanted_\d+ - /, "").replace(/\.mp3$/i, "");
        const separator = label.indexOf(" - ");
        return {
            audio: `audio/${filename}`,
            name: separator === -1 ? label : label.slice(separator + 3),
            album: separator === -1 ? "Need for Speed: Most Wanted" : label.slice(0, separator),
            cover: "images/MW.jpg"
        };
    })
};
const homeTrackFallback = [
    { audio: "audio/Gary Numan Like a B-Film.m4a", name: "Like a B-Film", album: "Telekon", cover: "images/like a b-film (1).jpg" },
    { audio: "audio/Gary Numan My Name Is Ruin (Official Video).m4a", name: "My Name Is Ruin", album: "Savage", cover: "images/my name is ruin.jpg" },
    { audio: "audio/Run_The_Jewels-the_ground_below-spaces.im.mp3", name: "The Ground Below", album: "RTJ4", cover: "images/the ground below.jpg" },
    { audio: "audio/Run_The_Jewels_-_Legend_Has_It_(mp3.pm).mp3", name: "Legend Has It", album: "RTJ3", cover: "images/legend has it.jpg" },
    { audio: "audio/Пост.mp3", name: "Пострадянська Доба", album: "BaWN, Пострадянська Доба", cover: "images/Пострадянська Доба.jpg" },
    { audio: "audio/молодість.mp3", name: "Молодість", album: "SadSvit, Casette", cover: "images/Молодість.jpg" },
    { audio: "audio/Teddy Swims Mr. Know It All.m4a", name: "Mr. Know It All", album: "Teddy Swims · Mr. Know It All", cover: "images/mr. know it all.jpg" },
    { audio: "audio/NSYNC Bye Bye Bye (Lyrics) (Deadpool 3 Soundtrack).m4a", name: "Bye Bye Bye", album: "*NSYNC · No Strings Attached", cover: "images/bye bye bye.jpg" }
];
const exploreExtras = [
    { audio: "audio/07. Hard Drivers.mp3", name: "Hard Drivers", album: "Ekstrak", cover: "images/hard drivers.jpg" },
    { audio: "audio/Asphalt_8_Airborne-breton_the_commission-spaces.im.mp3", name: "The Commission", album: "Breton", cover: "images/Breton.jpg" },
    { audio: "audio/BASTA_RHUMES_-_Break_Ya_Neck_(mp3.pm).mp3", name: "Break Ya Neck", album: "Busta Rhymes", cover: "images/break ya neck.jpg" }
];

try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    playlists = Array.isArray(saved) ? saved.filter((item) => item && typeof item.id === "string" && typeof item.name === "string") : [];
} catch {
    playlists = [];
}

function savePlaylists() {
    localStorage.setItem(storageKey, JSON.stringify(playlists));
}

function songFromCard(card) {
    return {
        audio: card.dataset.audio,
        name: card.querySelector(".song-name").textContent.trim(),
        album: card.querySelector(".song-album").textContent.trim(),
        cover: card.querySelector("img").getAttribute("src")
    };
}

function createSongCard(song) {
    const card = document.createElement("button");
    card.className = "song-card";
    card.type = "button";
    card.dataset.audio = song.audio;
    card.setAttribute("aria-pressed", "false");
    const cover = document.createElement("img");
    cover.src = song.cover;
    cover.alt = `${song.name} cover`;
    const name = document.createElement("span");
    name.className = "song-name";
    name.textContent = song.name;
    const album = document.createElement("span");
    album.className = "song-album";
    album.textContent = song.album;
    card.append(cover, name, album);
    return card;
}

const songMenu = document.createElement("div");
songMenu.className = "song-menu";
songMenu.setAttribute("role", "menu");
songMenu.setAttribute("aria-label", "Add song to playlist");
songMenu.hidden = true;
document.body.append(songMenu);

const playlistNotice = document.createElement("div");
playlistNotice.className = "playlist-notice";
playlistNotice.setAttribute("role", "status");
playlistNotice.hidden = true;
document.body.append(playlistNotice);
let noticeTimer;
let pendingSong = null;

function showPlaylistNotice(message) {
    clearTimeout(noticeTimer);
    playlistNotice.textContent = message;
    playlistNotice.hidden = false;
    noticeTimer = setTimeout(() => { playlistNotice.hidden = true; }, 3000);
}

function addSongToPlaylist(playlist, song) {
    if (!Array.isArray(playlist.songs)) playlist.songs = [];
    if (playlist.songs.some((item) => item.audio === song.audio)) {
        showPlaylistNotice("This song is already in the playlist.");
        return;
    }
    playlist.songs.push(song);
    try {
        savePlaylists();
        showPlaylistNotice(`Added to ${playlist.name}.`);
        if (location.pathname.endsWith("/playlists.html") && decodeURIComponent(location.hash.slice(2)) === playlist.id) {
            renderRoute();
        }
    } catch (error) {
        playlist.songs.pop();
        showPlaylistNotice("Could not save the song. Browser storage may be full.");
    }
}

document.addEventListener("contextmenu", (event) => {
    const card = event.target.closest(".song-card");
    if (!card) {
        songMenu.hidden = true;
        return;
    }
    event.preventDefault();
    songMenu.replaceChildren();
    const song = songFromCard(card);
    const heading = document.createElement("p");
    heading.textContent = `Add “${song.name}” to:`;
    songMenu.append(heading);
    playlists.forEach((playlist) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "menuitem");
        button.textContent = playlist.name;
        button.disabled = Array.isArray(playlist.songs) && playlist.songs.some((item) => item.audio === song.audio);
        button.addEventListener("click", () => {
            songMenu.hidden = true;
            addSongToPlaylist(playlist, song);
        });
        songMenu.append(button);
    });
    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.setAttribute("role", "menuitem");
    createButton.textContent = "+ New playlist";
    createButton.addEventListener("click", () => {
        pendingSong = song;
        songMenu.hidden = true;
        navigate("playlists.html#/new");
    });
    songMenu.append(createButton);
    songMenu.hidden = false;
    const x = event.clientX || card.getBoundingClientRect().left;
    const y = event.clientY || card.getBoundingClientRect().bottom;
    songMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - songMenu.offsetWidth - 8))}px`;
    songMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - songMenu.offsetHeight - 8))}px`;
});

document.addEventListener("click", (event) => {
    if (!songMenu.contains(event.target)) songMenu.hidden = true;
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") songMenu.hidden = true;
});

function playlistLink(playlist, showCover = false) {
    const link = document.createElement("a");
    link.href = `playlists.html#/${encodeURIComponent(playlist.id)}`;
    link.dataset.route = "";
    if (showCover) {
        if (playlist.image) {
            const image = document.createElement("img");
            image.className = "playlist-thumbnail";
            image.src = playlist.image;
            image.alt = "";
            link.append(image);
        } else {
            const placeholder = document.createElement("span");
            placeholder.className = "playlist-thumbnail playlist-placeholder";
            placeholder.setAttribute("aria-hidden", "true");
            placeholder.textContent = "♫";
            link.append(placeholder);
        }
    }
    const name = document.createElement("span");
    name.textContent = playlist.name;
    link.append(name);
    return link;
}

function renderSidebarPlaylists() {
    sidebarPlaylists.replaceChildren();
    playlists.forEach((playlist) => {
        const item = document.createElement("li");
        item.append(playlistLink(playlist, true));
        sidebarPlaylists.append(item);
    });
}

function renderPlaylistIndex() {
    const title = document.createElement("h1");
    title.textContent = "Your playlists";
    playlistView.append(title);

    if (!playlists.length) {
        const empty = document.createElement("p");
        empty.textContent = "No playlists yet. Create your first playlist.";
        playlistView.append(empty);
        return;
    }

    const list = document.createElement("ul");
    list.className = "playlist-grid";
    playlists.forEach((playlist) => {
        const item = document.createElement("li");
        item.append(playlistLink(playlist, true));
        list.append(item);
    });
    playlistView.append(list);
}

function renderPlaylist(playlist) {
    const back = document.createElement("a");
    back.href = "playlists.html";
    back.dataset.route = "";
    back.textContent = "← Your playlists";
    const title = document.createElement("h1");
    title.textContent = playlist.name;
    playlistView.append(back);
    if (playlist.image) {
        const image = document.createElement("img");
        image.className = "playlist-cover";
        image.src = playlist.image;
        image.alt = "";
        playlistView.append(image);
    }
    playlistView.append(title);
    const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
    if (!songs.length) {
        const empty = document.createElement("p");
        empty.textContent = "This playlist is empty.";
        playlistView.append(empty);
        return;
    }
    const list = document.createElement("div");
    list.className = "playlist-songs";
    songs.forEach((song) => list.append(createSongCard(song)));
    playlistView.append(list);
}

function getAllTracks() {
    const homeTracks = homeView
        ? Array.from(homeView.querySelectorAll(".music-layout .song-card"), songFromCard)
        : homeTrackFallback;
    const unique = new Map();
    [...homeTracks, ...mwPlaylist.songs, ...exploreExtras].forEach((song) => unique.set(song.audio, song));
    return Array.from(unique.values());
}

function renderExplore() {
    exploreView.replaceChildren();
    const title = document.createElement("h1");
    title.textContent = "Explore";
    const tracks = getAllTracks();
    const count = document.createElement("p");
    count.textContent = `${tracks.length} tracks`;
    const list = document.createElement("div");
    list.className = "explore-tracks";
    tracks.forEach((song) => list.append(createSongCard(song)));
    exploreView.append(title, count, list);
}

function readPlaylistImage(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
            return reject(new Error("Choose an image smaller than 10 MB."));
        }
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 400;
            const context = canvas.getContext("2d");
            const size = Math.min(image.width, image.height);
            context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 400, 400);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("The image could not be opened."));
        };
        image.src = url;
    });
}

function renderCreatePlaylist() {
    const title = document.createElement("h1");
    title.textContent = "New playlist";
    const form = document.createElement("form");
    form.className = "playlist-form";
    const label = document.createElement("label");
    label.htmlFor = "playlist-name";
    label.textContent = "Playlist name";
    const input = document.createElement("input");
    input.id = "playlist-name";
    input.name = "name";
    input.type = "text";
    input.maxLength = 80;
    input.required = true;
    input.placeholder = "My playlist";
    const imageLabel = document.createElement("label");
    imageLabel.htmlFor = "playlist-image";
    imageLabel.textContent = "Playlist image (optional)";
    const imageInput = document.createElement("input");
    imageInput.id = "playlist-image";
    imageInput.type = "file";
    imageInput.accept = "image/*";
    const errorMessage = document.createElement("p");
    errorMessage.className = "playlist-error";
    errorMessage.setAttribute("role", "alert");
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Create playlist";
    form.append(label, input, imageLabel, imageInput, submit, errorMessage);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = input.value.trim();
        if (!name) {
            input.focus();
            return;
        }
        submit.disabled = true;
        errorMessage.textContent = "";
        let playlist;
        try {
            const image = await readPlaylistImage(imageInput.files[0]);
            playlist = { id: crypto.randomUUID(), name, image, songs: pendingSong ? [pendingSong] : [] };
            playlists.push(playlist);
            savePlaylists();
            pendingSong = null;
            renderSidebarPlaylists();
            navigate(`playlists.html#/${encodeURIComponent(playlist.id)}`);
        } catch (error) {
            if (playlist) playlists = playlists.filter((item) => item !== playlist);
            errorMessage.textContent = error.name === "QuotaExceededError"
                ? "Browser storage is full. Try a smaller image."
                : error.message;
        } finally {
            submit.disabled = false;
        }
    });
    playlistView.append(title, form);
    input.focus();
}

async function ensureView(viewName) {
    if ((viewName === "home" && homeView) || (viewName === "playlists" && playlistView) || (viewName === "explore" && exploreView)) return;
    const page = viewName === "home" ? "index.html" : `${viewName}.html`;
    const response = await fetch(page);
    if (!response.ok) throw new Error(`Could not load ${page}`);
    const documentFromPage = new DOMParser().parseFromString(await response.text(), "text/html");
    const view = documentFromPage.querySelector(viewName === "home" ? "#home-view" : `#${viewName === "playlists" ? "playlist" : "explore"}-view`);
    if (!view) throw new Error(`Missing view in ${page}`);
    audioPlayer.before(view);
    if (viewName === "home") homeView = view;
    else if (viewName === "playlists") playlistView = view;
    else exploreView = view;
}

let routeVersion = 0;
async function renderRoute() {
    const version = ++routeVersion;
    const viewName = location.pathname.endsWith("/playlists.html")
        ? "playlists"
        : location.pathname.endsWith("/explore.html") ? "explore" : "home";
    if (viewName !== "playlists" || location.hash !== "#/new") pendingSong = null;
    try {
        await ensureView(viewName);
    } catch (error) {
        console.error(error);
        location.reload();
        return;
    }
    if (version !== routeVersion) return;
    if (homeView) homeView.hidden = viewName !== "home";
    if (playlistView) playlistView.hidden = viewName !== "playlists";
    if (exploreView) exploreView.hidden = viewName !== "explore";
    document.title = "SpeakerBox";

    if (viewName === "home") {
        updateSearchResults();
        setMenuOpen(false);
        return;
    }
    if (viewName === "explore") {
        renderExplore();
        document.title = "Explore · SpeakerBox";
        setMenuOpen(false);
        return;
    }
    playlistView.replaceChildren();
    const route = decodeURIComponent(location.hash.slice(1) || "/");
    if (route === "/new") {
        renderCreatePlaylist();
    } else if (route === "/") {
        renderPlaylistIndex();
    } else if (route.startsWith("/")) {
        const playlist = route === "/mw" ? mwPlaylist : playlists.find((item) => item.id === route.slice(1));
        if (playlist) {
            renderPlaylist(playlist);
            document.title = `${playlist.name} · SpeakerBox`;
        } else {
            playlistView.textContent = "Playlist not found.";
        }
    } else {
        playlistView.textContent = "Page not found.";
    }
    setMenuOpen(false);
}

function navigate(path) {
    const url = new URL(path, location.href);
    if (location.protocol === "file:" && url.pathname !== location.pathname) {
        location.href = url.href;
        return;
    }
    history.pushState(null, "", url);
    renderRoute();
}

const searchForm = document.querySelector('form[role="search"]');
const searchInput = document.querySelector("#search");
searchInput.value = new URLSearchParams(location.search).get("q") || searchInput.value;

function isMostWantedSearch(value) {
    const query = value.trim().toLowerCase().replace(/\s+/g, " ");
    return query === "mw" || query === "most wanted" || /^nfs\s*:\s*mw$/.test(query);
}

function updateSearchResults() {
    if (!homeView) return;
    const result = homeView.querySelector("#search-results");
    const list = homeView.querySelector("#search-results-list");
    const layout = homeView.querySelector(".music-layout");
    if (!result || !list || !layout) return;
    const query = searchInput.value.trim().toLocaleLowerCase();
    result.hidden = !query;
    layout.hidden = Boolean(query);
    list.replaceChildren();
    if (!query) return;

    const matchingPlaylists = [mwPlaylist, ...playlists].filter((playlist) =>
        playlist.name.toLocaleLowerCase().includes(query) ||
        (playlist === mwPlaylist && isMostWantedSearch(query))
    );
    matchingPlaylists.forEach((playlist) => {
        const link = playlistLink(playlist, true);
        link.classList.add("featured-playlist");
        const count = document.createElement("small");
        count.textContent = `${Array.isArray(playlist.songs) ? playlist.songs.length : 0} songs`;
        link.append(count);
        list.append(link);
    });

    const matchingTracks = getAllTracks().filter((song) =>
        `${song.name} ${song.album} ${song.audio}`.toLocaleLowerCase().includes(query)
    );
    matchingTracks.forEach((song) => list.append(createSongCard(song)));
    if (!matchingPlaylists.length && !matchingTracks.length) {
        const empty = document.createElement("p");
        empty.textContent = "Nothing found.";
        list.append(empty);
    }
}

function search() {
    if (location.pathname.endsWith("/playlists.html") || location.pathname.endsWith("/explore.html")) {
        navigate(`index.html?q=${encodeURIComponent(searchInput.value)}`);
    } else {
        const url = new URL(location.href);
        if (searchInput.value.trim()) url.searchParams.set("q", searchInput.value);
        else url.searchParams.delete("q");
        history.replaceState(null, "", url);
        updateSearchResults();
    }
}

searchInput.addEventListener("input", search);
searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    search();
});

document.addEventListener("click", (event) => {
    const newButton = event.target.closest("#new-playlist");
    if (newButton) {
        pendingSong = null;
        navigate("playlists.html#/new");
        return;
    }
    const link = event.target.closest("a[data-route]");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (location.protocol === "file:") return;
    event.preventDefault();
    navigate(link.href);
});
window.addEventListener("popstate", renderRoute);
renderSidebarPlaylists();
renderRoute();

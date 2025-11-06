import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
    getStorage
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBiazxsNqn_kj0VQqROMnp0XU2OukdMtNo",
    authDomain: "minecraft-hub-2f796.firebaseapp.com",
    projectId: "minecraft-hub-2f796",
    storageBucket: "minecraft-hub-2f796.appspot.com",
    messagingSenderId: "574308739058",
    appId: "1:574308739058:web:399691b7aeb785678fad6b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- ADMIN USER IDs --- REEMPLAZA CON TUS UIDS REALES
const ADMIN_UIDS = [
    "W3Q0SYQQ7sVuygy4w2bq9nur95t1", // Tu UID
    "d3l33SOZIpMn8bcD708blbLcB2m1" // UID del otro admin
];

// Variables globales
let lastSubmissionTime = 0;
const COOLDOWN_TIME = 5 * 60 * 1000;
let currentCategory = '';
const LAST_VISITED_KEY = 'lastVisitedTime';
let currentUser = null;

// Variables para Paginación
const pageSize = 12;
const lastVisibleDocs = {};

// Elementos del DOM
const publishContentBtn = document.getElementById('publishContentBtn');
const contentFormOverlay = document.getElementById('contentFormOverlay');
const closeFormBtn = document.getElementById('closeFormBtn');
const publishForm = document.getElementById('publishForm');
const versionsContainer = document.getElementById('versionsContainer');
const addVersionBtn = document.getElementById('addVersionBtn');
const mainHub = document.getElementById('mainHub');
const contentSections = document.getElementById('contentSections');
const categoryBtns = document.querySelectorAll('.category-btn');
const cooldownMessage = document.getElementById('cooldownMessage');
const userNameInput = document.getElementById('userNameInput');
const loadingOverlay = document.getElementById('loadingOverlay');
const contentTypeSelect = document.getElementById('contentType');
const newContentCountDisplay = document.getElementById('newContentCount');
const themeToggleBtn = document.getElementById('themeToggleBtn');

// Nuevos elementos para búsqueda
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// Elementos para login de admin
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLoginContainer = document.getElementById('adminLoginContainer');
const closeAdminLoginBtn = document.getElementById('closeAdminLoginBtn');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminEmailInput = document.getElementById('adminEmail');
const adminPasswordInput = document.getElementById('adminPassword');

const trendsSection = document.getElementById('trends-section');
const trendsGrid = document.getElementById('trends-grid');
const trendsPaginationBtn = trendsSection.querySelector('.next-btn');

const minecraftDownloadsList = document.getElementById('minecraftDownloadsList');
const minecraftDownloadsSection = document.getElementById('minecraft-downloads-section');
const minecraftDownloadsPagination = document.getElementById('minecraftDownloadsPagination');

// Variable para controlar el listener del submit de comentarios
let submitCommentBaseListener = null;

// --- Funciones para Mostrar/Ocultar Carga ---
function showLoading() {
    loadingOverlay.classList.add('show');
}

function hideLoading() {
    loadingOverlay.classList.remove('show');
}

// --- Lógica de Modo Oscuro/Claro ---
function initializeTheme() {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light-mode') {
        document.body.classList.add('light-mode');
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Función para verificar si el usuario actual es admin
function isCurrentUserAdmin() {
    return currentUser && ADMIN_UIDS.includes(currentUser.uid);
}

// Función para actualizar la visibilidad del botón de publicar
function updatePublishButtonVisibility() {
    if (isCurrentUserAdmin()) {
        publishContentBtn.style.display = 'inline-block';
        publishContentBtn.textContent = '⬇️ Publicar Contenido (Admin)';
        if (adminLoginBtn) adminLoginBtn.style.display = 'none';
    } else {
        publishContentBtn.style.display = 'none';
        if (adminLoginBtn) adminLoginBtn.style.display = 'flex';
    }
}

function updateCooldownMessage() {
    if (window._cooldownInterval) {
        clearInterval(window._cooldownInterval);
    }

    window._cooldownInterval = setInterval(() => {
        const remainingTime = COOLDOWN_TIME - (Date.now() - lastSubmissionTime);

        if (remainingTime <= 0) {
            cooldownMessage.textContent = '';
            clearInterval(window._cooldownInterval);
            localStorage.removeItem('lastSubmissionTime');
            window._cooldownInterval = null;
        } else {
            const minutes = Math.floor(remainingTime / 1000 / 60);
            const seconds = Math.floor((remainingTime / 1000) % 60);
            cooldownMessage.textContent = `Podrás publicar nuevo contenido en ${minutes}m ${seconds}s`;
        }
    }, 1000);
}

async function updateNewContentCount() {
    const lastVisitedTime = localStorage.getItem(LAST_VISITED_KEY);
    let newContentQuery = query(collection(db, "contenidos"));

    if (lastVisitedTime) {
        const lastTime = new Date(parseInt(lastVisitedTime));
        newContentQuery = query(newContentQuery, where("fecha", ">", lastTime));
    }
    
    newContentQuery = query(newContentQuery, where("tipo", "!=", "minecraft-version"));

    const snapshot = await getDocs(newContentQuery);
    const newCount = snapshot.size;

    if (newCount > 0) {
        newContentCountDisplay.textContent = `¡${newCount} nuevos archivos añadidos!`;
        newContentCountDisplay.style.display = 'block';
    } else {
        newContentCountDisplay.textContent = 'No hay archivos nuevos.';
        newContentCountDisplay.style.display = 'block';
    }
    
    if (!lastVisitedTime) {
        localStorage.setItem(LAST_VISITED_KEY, Date.now().toString());
    }
}

async function updateLastVisitedTime() {
    localStorage.setItem(LAST_VISITED_KEY, Date.now().toString());
    await updateNewContentCount();
}

// --- FUNCIÓN DE BÚSQUEDA ---
async function searchContent(searchTerm) {
    if (!searchTerm.trim()) {
        alert('Por favor, ingresa un término de búsqueda.');
        return;
    }

    showLoading();
    
    // Ocultar otras secciones
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    mainHub.style.display = 'none';

    // Crear o mostrar sección de resultados de búsqueda
    let searchSection = document.getElementById('search-results-section');
    if (!searchSection) {
        searchSection = document.createElement('div');
        searchSection.className = 'content-section';
        searchSection.id = 'search-results-section';
        searchSection.innerHTML = `
            <h2><i class="fas fa-search"></i> Resultados de Búsqueda</h2>
            <a href="#" class="back-btn">← Volver al Hub</a>
            <div class="content-grid" id="search-results-grid"></div>
            <div class="no-results" id="noResults" style="display: none;">
                No se encontraron resultados para "${searchTerm}"
            </div>
        `;
        contentSections.appendChild(searchSection);
        searchSection.querySelector('.back-btn').addEventListener('click', handleBackButtonClick);
    }

    const grid = document.getElementById('search-results-grid');
    const noResults = document.getElementById('noResults');
    grid.innerHTML = '';
    noResults.style.display = 'none';

    try {
        // Buscar en título y descripción
        const contenidosRef = collection(db, "contenidos");
        const q = query(
            contenidosRef,
            where("tipo", "!=", "minecraft-version") // Excluir versiones de Minecraft
        );

        const querySnapshot = await getDocs(q);
        const results = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const searchableText = (data.titulo + ' ' + data.descripcion + ' ' + data.tipo).toLowerCase();
            const searchTermLower = searchTerm.toLowerCase();

            if (searchableText.includes(searchTermLower)) {
                results.push({
                    id: doc.id,
                    ...data
                });
            }
        });

        if (results.length > 0) {
            const cardPromises = results.map(contenido => createContentCard(contenido, true));
            const cards = await Promise.all(cardPromises);
            cards.forEach(card => grid.appendChild(card));
            
            searchSection.querySelector('h2').innerHTML = `<i class="fas fa-search"></i> Resultados para "${searchTerm}" (${results.length})`;
        } else {
            noResults.textContent = `No se encontraron resultados para "${searchTerm}"`;
            noResults.style.display = 'block';
        }

        searchSection.classList.add('active');
        currentCategory = 'search';
    } catch (error) {
        console.error("Error en la búsqueda:", error);
        alert('Error al realizar la búsqueda.');
    } finally {
        hideLoading();
    }
}

// Función para eliminar publicación (solo admins)
async function deletePublication(contentId, imageUrl) {
    if (!isCurrentUserAdmin()) {
        alert('Solo los administradores pueden eliminar publicaciones.');
        return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación? Esta acción es irreversible.')) {
        return;
    }

    showLoading();
    try {
        await deleteDoc(doc(db, "contenidos", contentId));

        hideLoading();
        alert('Publicación eliminada correctamente.');

        // Recargar la sección actual
        if (currentCategory && document.getElementById(`${currentCategory}-section`) && document.getElementById(`${currentCategory}-section`).classList.contains('active')) {
            if (currentCategory === 'minecraft-downloads') {
                loadMinecraftDownloads(null);
            } else if (currentCategory === 'trends') {
                loadTrends(null);
            } else if (currentCategory === 'search') {
                const currentSearch = searchInput.value;
                if (currentSearch) {
                    searchContent(currentSearch);
                }
            } else {
                loadCategoryContent(currentCategory, null);
            }
        } else {
            handleBackButtonClick();
        }
    } catch (error) {
        hideLoading();
        console.error("Error al eliminar publicación:", error);
        alert('Error al eliminar la publicación.');
    }
}

async function loadCategoryContent(category, lastDoc = null) {
    showLoading();
    currentCategory = category;

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    mainHub.style.display = 'none';

    const sectionId = `${category}-section`;
    let section = document.getElementById(sectionId);
    if (!section) {
        section = document.createElement('div');
        section.className = 'content-section';
        section.id = sectionId;
        section.innerHTML = `
            <h2>${getCategoryName(category)}</h2>
            <a href="#" class="back-btn">← Volver al Hub</a>
            <div class="content-grid" id="${category}-grid"></div>
            <div class="pagination-controls">
                <button class="next-btn" data-category="${category}">Cargar más</button>
            </div>
        `;
        contentSections.appendChild(section);
        section.querySelector('.back-btn').addEventListener('click', handleBackButtonClick);
        section.querySelector('.next-btn').addEventListener('click', (e) => {
            loadCategoryContent(category, lastVisibleDocs[category]);
        });
    }

    const grid = document.getElementById(`${category}-grid`);
    if (!lastDoc) {
        grid.innerHTML = '';
    }

    let q = query(
        collection(db, "contenidos"),
        where("tipo", "==", category),
        orderBy("fecha", "desc"),
        limit(pageSize)
    );

    if (lastDoc) {
        q = query(
            collection(db, "contenidos"),
            where("tipo", "==", category),
            orderBy("fecha", "desc"),
            startAfter(lastDoc),
            limit(pageSize)
        );
    }

    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs;

    if (documents.length === 0 && !lastDoc) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">No hay contenido en esta categoría aún.</p>';
        section.querySelector('.next-btn').style.display = 'none';
    } else if (documents.length === 0) {
        alert("No hay más publicaciones en esta categoría.");
        section.querySelector('.next-btn').style.display = 'none';
    } else {
        const cardPromises = documents.map(docSnap => createContentCard({
            id: docSnap.id,
            ...docSnap.data()
        }, true));
        const cards = await Promise.all(cardPromises);
        cards.forEach(card => grid.appendChild(card));

        lastVisibleDocs[category] = documents[documents.length - 1];
        section.querySelector('.next-btn').style.display = 'inline-block';
    }

    section.classList.add('active');
    hideLoading();
}

async function loadMinecraftDownloads(lastDoc = null) {
    showLoading();
    currentCategory = 'minecraft-downloads';

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    mainHub.style.display = 'none';

    const listContainer = minecraftDownloadsList;
    if (!lastDoc) {
        listContainer.innerHTML = '';
    }

    let q = query(
        collection(db, "contenidos"),
        where("tipo", "==", "minecraft-version"),
        orderBy("fecha", "desc"),
        limit(pageSize)
    );

    if (lastDoc) {
        q = query(
            collection(db, "contenidos"),
            where("tipo", "==", "minecraft-version"),
            orderBy("fecha", "desc"),
            startAfter(lastDoc),
            limit(pageSize)
        );
    }

    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs;

    if (documents.length === 0 && !lastDoc) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">No hay versiones de Minecraft disponibles aún.</p>';
        minecraftDownloadsPagination.querySelector('.next-btn').style.display = 'none';
    } else if (documents.length === 0) {
        alert("No hay más versiones de Minecraft disponibles.");
        minecraftDownloadsPagination.querySelector('.next-btn').style.display = 'none';
    } else {
        for (const docSnap of documents) {
            const contenido = docSnap.data();
            contenido.id = docSnap.id;
            if (contenido.versiones && typeof contenido.versiones === 'object') {
                for (const [versionName, downloadLink] of Object.entries(contenido.versiones)) {
                    const downloadItem = createDownloadItem(versionName, downloadLink, docSnap.id);
                    listContainer.appendChild(downloadItem);
                }
            }
        }
        lastVisibleDocs['minecraft-version'] = documents[documents.length - 1];
        minecraftDownloadsPagination.querySelector('.next-btn').style.display = 'inline-block';
    }
    minecraftDownloadsSection.classList.add('active');
    hideLoading();
}

function handleCategoryClick(e) {
    e.preventDefault();
    const categoria = e.currentTarget.dataset.category;

    lastVisibleDocs[categoria] = null;

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    mainHub.style.display = 'none';

    if (categoria === 'minecraft-downloads') {
        loadMinecraftDownloads();
    } else if (categoria === 'trends') {
        loadTrends();
    } else {
        loadCategoryContent(categoria);
    }
    updateLastVisitedTime();
}

function handleBackButtonClick(e) {
    if (e) e.preventDefault();
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    mainHub.style.display = 'inline-block';
    currentCategory = '';
    updateLastVisitedTime();
}

async function createContentCard(contenido, showDeleteButton = false) {
    const versiones = Object.keys(contenido.versiones || {});
    const primeraVersion = versiones[0];
    const primerLink = contenido.versiones[primeraVersion];

    let deleteButtonHtml = '';
    if (showDeleteButton && isCurrentUserAdmin()) {
        deleteButtonHtml = `<button class="delete-content-btn" data-id="${contenido.id}" data-image-url="${contenido.imagenURL}">🗑️</button>`;
    }

    const card = document.createElement('div');
    card.className = 'content-card';
    card.innerHTML = `
        <img data-src="${contenido.imagenURL || 'https://i.imgur.com/hUPXXQF.png'}" alt="${contenido.titulo}" class="lazyload-img">
        <div class="card-body">
            ${deleteButtonHtml}
            <h3>${contenido.titulo}</h3>
            <p>${contenido.descripcion}</p>
            <p style="margin-bottom: 5px;"></p> 
            <p><small>Publicado por: ${contenido.nombre || "Anónimo"}</small></p>

            <div class="interaction-buttons">
                <div class="like-section">
                    <button class="like-btn" data-content-id="${contenido.id}">❤️</button>
                    <span class="likes-count">${contenido.likes || 0} likes</span>
                </div>
                <div class="favorite-section">
                    <button class="favorite-btn" data-content-id="${contenido.id}"><i class="far fa-star"></i></button>
                    <span class="favorites-count">Favorito</span>
                </div>
            </div>

            <select class="version-select">
                ${versiones.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
            <a href="${primerLink}" target="_blank" class="download-btn" data-content-id="${contenido.id}">Descargar</a>

            <div class="comments-section">
                <div class="comment-form" data-content-id="${contenido.id}">
                    <input type="text" class="comment-input" placeholder="Añade un comentario...">
                    <button class="comment-submit">Enviar</button>
                </div>
                <div class="comments-list" id="comments-${contenido.id}">
                </div>
            </div>
        </div>
    `;

    const deleteButton = card.querySelector('.delete-content-btn');
    if (deleteButton) {
        deleteButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const contentId = e.target.dataset.id;
            const imageUrl = e.target.dataset.imageUrl;
            await deletePublication(contentId, imageUrl);
        });
    }
    
    const downloadButton = card.querySelector('.download-btn');
    downloadButton.addEventListener('click', () => {
        alert('Descarga iniciada. ¡Disfruta del contenido!');
    });

    const likeBtn = card.querySelector('.like-btn');
    const likesCount = card.querySelector('.likes-count');
    const favoriteBtn = card.querySelector('.favorite-btn');

    const likedContents = JSON.parse(localStorage.getItem('likedContents') || '{}');
    if (likedContents[contenido.id]) {
        likeBtn.classList.add('liked');
    }

    likeBtn.addEventListener('click', async () => {
        alert('Inicia sesión para dar "like" al contenido.');
    });

    favoriteBtn.addEventListener('click', async () => {
        alert('Inicia sesión para añadir a favoritos.');
    });

    const commentInput = card.querySelector('.comment-input');
    const commentSubmit = card.querySelector('.comment-submit');
    const commentsList = card.querySelector('.comments-list');
    const commentForm = card.querySelector('.comment-form');

    async function submitComment(parentId = null, replyToUser = '') {
        alert('Inicia sesión para comentar.');
    }

    submitCommentBaseListener = () => submitComment();
    commentSubmit.addEventListener('click', submitCommentBaseListener);

    loadComments(contenido.id, commentsList);

    const versionSelect = card.querySelector('.version-select');
    const downloadBtn = card.querySelector('.download-btn');
    versionSelect.addEventListener('change', () => {
        const version = versionSelect.value;
        downloadBtn.href = contenido.versiones[version] || '#';
    });

    const lazyImage = card.querySelector('.lazyload-img');
    if ('IntersectionObserver' in window) {
        let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    let img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazyload-img');
                    lazyImageObserver.unobserve(img);
                }
            });
        });
        lazyImageObserver.observe(lazyImage);
    } else {
        lazyImage.src = lazyImage.dataset.src;
        lazyImage.classList.remove('lazyload-img');
    }

    return card;
}

async function loadComments(contentId, container) {
    const q = query(
        collection(db, "comentarios"),
        where("contenidoId", "==", contentId),
        orderBy("fecha", "asc")
    );

    const querySnapshot = await getDocs(q);
    container.innerHTML = '';

    if (querySnapshot.empty) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-color-secondary);">Sé el primero en comentar.</p>';
        return;
    }

    const comments = [];
    querySnapshot.forEach((doc) => {
        comments.push({
            id: doc.id,
            ...doc.data()
        });
    });

    const commentMap = new Map();
    comments.forEach(comment => commentMap.set(comment.id, {
        ...comment,
        replies: []
    }));

    const rootComments = [];
    comments.forEach(comment => {
        if (comment.parentId && commentMap.has(comment.parentId)) {
            commentMap.get(comment.parentId).replies.push(commentMap.get(comment.id));
        } else {
            rootComments.push(commentMap.get(comment.id));
        }
    });

    function renderComment(comment, parentElement) {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';
        commentElement.innerHTML = `
            <div class="comment">
                <span class="comment-author">${comment.autor}</span>
                <span class="comment-time">${formatDate(comment.fecha?.toDate())}</span>
                <p class="comment-text">${comment.texto}</p>
                <div class="comment-actions">
                    <button class="comment-reply-btn" data-comment-id="${comment.id}" data-author="${comment.autor}">Responder</button>
                </div>
            </div>
            <div class="comment-replies"></div>
        `;
        parentElement.appendChild(commentElement);

        commentElement.querySelector('.comment-reply-btn').addEventListener('click', (e) => {
            alert('Inicia sesión para responder comentarios.');
        });
    }

    rootComments.sort((a, b) => a.fecha.toDate() - b.fecha.toDate()).forEach(comment => renderComment(comment, container));
}

async function loadTrends(lastDoc = null) {
    showLoading();
    currentCategory = 'trends';

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    mainHub.style.display = 'none';

    const grid = trendsGrid;
    if (!lastDoc) {
        grid.innerHTML = '';
    }

    let q = query(
        collection(db, "contenidos"),
        orderBy("fecha", "desc"),
        limit(pageSize)
    );

    if (lastDoc) {
        q = query(
            collection(db, "contenidos"),
            orderBy("fecha", "desc"),
            startAfter(lastDoc),
            limit(pageSize)
        );
    }

    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs;

    if (documents.length === 0 && !lastDoc) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">No hay contenido en tendencia aún.</p>';
        trendsPaginationBtn.style.display = 'none';
    } else if (documents.length === 0) {
        alert("No hay más contenido en tendencia.");
        trendsPaginationBtn.style.display = 'none';
    } else {
        const cardPromises = documents.map(docSnap => createContentCard({
            id: docSnap.id,
            ...docSnap.data()
        }, true));
        const cards = await Promise.all(cardPromises);
        cards.forEach(card => grid.appendChild(card));

        lastVisibleDocs['trends'] = documents[documents.length - 1];
        trendsPaginationBtn.style.display = 'inline-block';
    }

    trendsSection.classList.add('active');
    hideLoading();
}

function formatDate(date) {
    if (!date) return '';
    return date.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCategoryName(categoria) {
    const nombres = {
        textura: 'Texturas',
        addon: 'Addons',
        mod: 'Mods',
        plantilla: 'Plantillas',
        skin: 'Skins',
        shader: 'Shaders',
        tutorial: 'Tutoriales',
        'minecraft-downloads': 'Descargas de Minecraft',
        'minecraft-version': 'Descargas de Minecraft',
        'trends': 'Contenido en Tendencia'
    };
    return nombres[categoria] || categoria;
}

function createDownloadItem(versionName, downloadLink, contentId) {
    const item = document.createElement('div');
    item.className = 'download-item';
    
    let deleteBtnHtml = '';
    if (isCurrentUserAdmin()) {
        deleteBtnHtml = `<button class="delete-content-btn" data-id="${contentId}" data-image-url="" style="background: rgba(255, 0, 0, 0.7); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; font-size: 0.8rem; cursor: pointer; display: flex; justify-content: center; align-items: center;">🗑️</button>`;
    }

    item.innerHTML = `
        <span>Minecraft ${versionName}</span>
        <div style="display:flex; align-items:center; gap:10px;">
            ${deleteBtnHtml}
            <a href="${downloadLink}" target="_blank">Descargar</a>
        </div>
    `;

    const deleteButton = item.querySelector('.delete-content-btn');
    if (deleteButton) {
        deleteButton.addEventListener('click', async (e) => {
            const idToDelete = e.target.dataset.id;
            await deletePublication(idToDelete, '');
        });
    }

    return item;
}

// --- DOMContentLoaded: Inicializaciones y EventListeners ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded cargado. Iniciando aplicación.");

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('ServiceWorker registration failed: ', registrationError);
                });
        });
    }

    initializeTheme();
    
    // Configurar event listeners para login de admin
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            adminLoginContainer.style.display = 'flex';
        });
    }

    if (closeAdminLoginBtn) {
        closeAdminLoginBtn.addEventListener('click', () => {
            adminLoginContainer.style.display = 'none';
        });
    }

    if (adminLoginContainer) {
        adminLoginContainer.addEventListener('click', (event) => {
            if (event.target === adminLoginContainer) {
                adminLoginContainer.style.display = 'none';
            }
        });
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showLoading();
            
            const email = adminEmailInput.value;
            const password = adminPasswordInput.value;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                if (ADMIN_UIDS.includes(user.uid)) {
                    alert('¡Bienvenido Administrador!');
                    adminLoginContainer.style.display = 'none';
                    adminLoginForm.reset();
                } else {
                    await signOut(auth);
                    alert('No tienes permisos de administrador.');
                }
            } catch (error) {
                console.error("Error al iniciar sesión:", error.message);
                alert(`Error al iniciar sesión: ${error.message}`);
            } finally {
                hideLoading();
            }
        });
    }

    // Escuchar cambios en la autenticación
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        console.log("Estado de autenticación cambiado:", user ? `Usuario: ${user.email}` : "No hay usuario");
        updatePublishButtonVisibility();
    });

    // Event listeners para búsqueda
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                currentCategory = 'search';
                searchContent(searchTerm);
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    currentCategory = 'search';
                    searchContent(searchTerm);
                }
            }
        });
    }

    const storedTime = localStorage.getItem('lastSubmissionTime');
    if (storedTime) {
        lastSubmissionTime = parseInt(storedTime, 10);
        updateCooldownMessage();
    }
    
    await updateNewContentCount();
    setInterval(updateNewContentCount, 60 * 1000);

    // Event Listeners
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light-mode');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            localStorage.setItem('theme', 'dark-mode');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });

    closeFormBtn.addEventListener('click', () => { contentFormOverlay.style.display = 'none'; });
    contentFormOverlay.addEventListener('click', (event) => {
        if (event.target === contentFormOverlay) {
            contentFormOverlay.style.display = 'none';
        }
    });

    addVersionBtn.addEventListener('click', () => {
        const versionDiv = document.createElement('div');
        versionDiv.classList.add('version-block');
        versionDiv.innerHTML = `
            <input type="text" name="version-name[]" placeholder="Nombre de versión (ej: 1.20)" required>
            <input type="url" name="version-link[]" placeholder="Link de descarga (solo MediaFire)" required>
            <button type="button" class="removeVersionBtn">❌ Quitar</button>
        `;
        versionsContainer.appendChild(versionDiv);

        versionDiv.querySelector('.removeVersionBtn').addEventListener('click', () => {
            versionDiv.remove();
        });
    });

    publishForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!isCurrentUserAdmin()) {
            alert('Solo los administradores pueden publicar contenido.');
            return;
        }

        const currentTime = Date.now();
        const timeSinceLastSubmission = currentTime - lastSubmissionTime;

        if (timeSinceLastSubmission < COOLDOWN_TIME) {
            const remainingTimeSeconds = Math.ceil((COOLDOWN_TIME - timeSinceLastSubmission) / 1000);
            const minutes = Math.floor(remainingTimeSeconds / 60);
            const seconds = remainingTimeSeconds % 60;
            alert(`Debes esperar ${minutes}m ${seconds}s antes de publicar nuevo contenido.`);
            return;
        }

        const userName = userNameInput.value;
        const contentTitle = document.getElementById('contentTitle').value;
        const contentDescription = document.getElementById('contentDescription').value;
        const contentType = document.getElementById('contentType').value;
        const contentImageFile = document.getElementById('contentImage').files[0];

        const versionInputs = versionsContainer.querySelectorAll('.version-block');
        const versiones = {};
        let isValidMediaFire = true;

        versionInputs.forEach((block) => {
            const versionName = block.querySelector('input[name="version-name[]"]').value;
            const versionLink = block.querySelector('input[name="version-link[]"]').value;

            if (versionLink && !versionLink.includes("mediafire.com")) {
                isValidMediaFire = false;
            }

            if (versionName && versionLink) {
                versiones[versionName] = versionLink;
            }
        });

        if (!isValidMediaFire) {
            alert('Solo se admiten enlaces de MediaFire para las descargas.');
            hideLoading();
            return;
        }

        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
        });

        showLoading();
        try {
            const base64 = await toBase64(contentImageFile);
            const formData = new FormData();
            formData.append("key", "2f46a52689b8faf89cb1a670b25e89d5");
            formData.append("image", base64);

            const res = await fetch("https://api.imgbb.com/1/upload", {
                method: "POST",
                body: formData
            });

            const dataImgBB = await res.json();
            if (!dataImgBB.data || !dataImgBB.data.url) {
                throw new Error("Error al subir imagen a ImgBB: " + (dataImgBB.error?.message || "Error desconocido"));
            }
            const imagenURL = dataImgBB.data.url;
            
            await addDoc(collection(db, "contenidos"), {
                nombre: userName,
                titulo: contentTitle,
                descripcion: contentDescription,
                tipo: contentType,
                versiones: versiones,
                fecha: serverTimestamp(),
                imagenURL: imagenURL,
                vistas: 0,
                likes: 0,
            });

            lastSubmissionTime = currentTime;
            localStorage.setItem('lastSubmissionTime', currentTime.toString());
            updateCooldownMessage();
            
            await updateLastVisitedTime();

            hideLoading();
            alert('¡Contenido publicado exitosamente!');
            contentFormOverlay.style.display = 'none';
            publishForm.reset();

            versionsContainer.innerHTML = `
                <div class="version-block">
                    <input type="text" name="version-name[]" placeholder="Nombre de versión (ej: 1.20)" required>
                    <input type="url" name="version-link[]" placeholder="Link de descarga (solo MediaFire)" required>
                </div>
            `;

            const activeSection = document.querySelector('.content-section.active');
            if (activeSection) {
                const activeCategory = activeSection.id.replace('-section', '');
                if (activeCategory === 'minecraft-downloads') {
                    loadMinecraftDownloads(null);
                } else if (activeCategory === 'trends') {
                    loadTrends(null);
                } else {
                    loadCategoryContent(activeCategory, null);
                }
            }
        } catch (err) {
            hideLoading();
            console.error("Error al publicar:", err);
            alert(`Error al publicar el contenido: ${err.message}`);
        }
    });
    
    // Mostrar hub principal
    mainHub.style.display = 'inline-block';

    // Botón de publicar
    publishContentBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (isCurrentUserAdmin()) {
            contentFormOverlay.style.display = 'flex';
        } else {
            alert('Solo los administradores pueden publicar contenido.');
            if (adminLoginContainer) adminLoginContainer.style.display = 'flex';
        }
    });

    // Event Listeners para botones de categoría
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', handleCategoryClick);
    });

    minecraftDownloadsPagination.querySelector('.next-btn').addEventListener('click', () => {
        loadMinecraftDownloads(lastVisibleDocs['minecraft-version']);
    });

    trendsPaginationBtn.addEventListener('click', () => {
        loadTrends(lastVisibleDocs['trends']);
    });

    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', handleBackButtonClick);
    });

    // Inicializar
    updatePublishButtonVisibility();
});


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
    updateDoc,
    doc,
    increment,
    orderBy,
    limit,
    getDoc,
    setDoc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    startAfter,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

// Configuración de Firebase - ¡REEMPLAZA CON TUS PROPIAS CREDENCIALES!
const firebaseConfig = {
    apiKey: "AIzaSyBiazxsNqn_kj0VQqROMnp0XU2OukdMtNo", // Reemplaza con tu API Key
    authDomain: "minecraft-hub-2f796.firebaseapp.com", // Reemplaza con tu Auth Domain
    projectId: "minecraft-hub-2f796", // Reemplaza con tu Project ID
    storageBucket: "minecraft-hub-2f796.appspot.com", // Reemplaza con tu Storage Bucket
    messagingSenderId: "574308739058", // Reemplaza con tu Messaging Sender ID
    appId: "1:574308739058:web:399691b7aeb785678fad6b" // Reemplaza con tu App ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Variables globales
let lastSubmissionTime = 0;
const COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutos en milisegundos
let currentUser = null;
let currentUserData = null;
let selectedAvatarUrl = "https://i.ibb.co/5WF3JMwB/IMG-20250626-WA0080.jpg";
let currentCategory = '';
const LAST_VISITED_KEY = 'lastVisitedTime';

// --- ADMIN USER ID ---
const ADMIN_UID = "W3Q0SYQQ7sVuygy4w2bq9nur95t1"; // ¡Asegúrate de reemplazar esto con tu UID de administrador!

// --- Variables para Paginación ---
const pageSize = 12; // Número de publicaciones por página
const lastVisibleDocs = {}; // Objeto para guardar el último documento visible por categoría

// --- Monedas por categoría de publicación ---
const COINS_PER_CATEGORY = {
    "textura": 25,
    "addon": 25,
    "mod": 25,
    "plantilla": 25,
    "skin": 25,
    "shader": 25,
    "tutorial": 25,
    "minecraft-version": 30 // Solo admins
};

// --- Items de la tienda ---
const SHOP_ITEMS = [
    // --- EJEMPLOS DE BANNERS ---
    { id: 'banner_forest', type: 'banner', name: 'Banner Bosque', cost: 70, imageUrl: 'https://i.ibb.co/vWLMKsX/banner1.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },
    { id: 'banner_lava', type: 'banner', name: 'Banner Lava', cost: 70, imageUrl: 'https://i.ibb.co/RGPL8q3P/82fc81a8c39859c1f389d1c2cf33c77d.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },
    { id: 'banner_end', type: 'banner', name: 'Banner End', cost: 70, imageUrl: 'https://i.ibb.co/fGCZtXNt/bf955018b91cc92fb2d4969de65169f0.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },
      { id: 'banner_diamond', type: 'banner', name: 'Banner Diamante', cost: 70, imageUrl: 'https://i.ibb.co/C3NPh4mp/1f24b4c4b5bda7c8feb99951952e8acf.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },
    { id: 'banner_chickens', type: 'banner', name: 'Banner Pollos', cost: 70, imageUrl: 'https://i.ibb.co/CsYP1r8h/6f00d73e426549d0f5b1bb873bf2015f.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },
    { id: 'banner_cherry', type: 'banner', name: 'Banner Cerezos', cost: 70, imageUrl: 'https://i.ibb.co/HDFqZsM8/05f847cfee1c05a47bba89722111743d.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },
      { id: 'banner_sniffer', type: 'banner', name: 'Banner Sniffer', cost: 70, imageUrl: 'https://i.ibb.co/nNQbdGHK/d082ab2422a8f77b3d77cc2b214095fb.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },
    { id: 'banner_warden', type: 'banner', name: 'Banner Warden', cost: 70, imageUrl: 'https://i.ibb.co/7JYdP0k2/ad96acba559ab840e08b7645c8307d47.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },
    { id: 'banner_ajolote', type: 'banner', name: 'Banner Ajolote', cost: 70, imageUrl: 'https://i.ibb.co/nqhsBxNG/c90a85c5723e9770b38476908e4e15aa.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },
    { id: 'banner_scream', type: 'banner', name: 'Banner scream', cost: 70, imageUrl: 'https://i.ibb.co/pjPsv1sH/6ef1c52c58b8f6f7f0dec7a6f90645da.jpg', style: 'height: 150px; width: 100%; object-fit: cover;' },

    
    // --- EJEMPLOS DE ESLÓGANES ---
    { id: 'slogan_pro', type: 'slogan', name: 'Slogan: ¡PRO!', cost: 50, text: '¡PRO!', style: 'color: #00ff00;' },
    { id: 'slogan_ban_trixxi', type: 'slogan', name: '2 DIAS', cost: 1000, text: '¡BAN TRIXXI!', style: 'color:rgb(186, 30, 134);' },
    { id: 'slogan_esclavo_radd', type: 'slogan', name: 'Slogan: ESCLAVO DE RADD', cost: 50, text: 'ESCLAVO DE RADD', style: 'color:rgb(255, 25, 0);' },
    { id: 'slogan_ban_jus', type: 'slogan', name: '2 DIAS', cost: 1000, text: '¡BAN JUS!', style: 'color:rgb(18, 191, 226);' },
    { id: 'slogan_admin', type: 'slogan', name: '5 DIAS🔥"', cost: 2000, text: 'ADMIN🔥', style: 'color:rgb(4, 224, 11);' },
    { id: 'slogan_legend', type: 'slogan', name: 'Slogan: LEYENDA', cost: 120, text: '¡LEYENDA DEL HUB!', style: 'color: gold; text-shadow: 0 0 5px orange;' },
    { id: 'slogan_ban_radd', type: 'slogan', name: '3 DIAS', cost: 1500, text: '¡BAN RADD!', style: 'color:rgb(18, 181, 216);' },
    { id: 'slogan_ban_eluney', type: 'slogan', name: '2 DIAS', cost: 1000, text: '¡BAN ELUNEY!', style: 'color:rgb(15, 189, 216);' },
    { id: 'slogan_ban_animan', type: 'slogan', name: '2 DIAS', cost: 1000, text: '¡BAN ANIMAN!', style: 'color:rgb(18, 181, 226);' },
    
    

    // --- EJEMPLOS DE INSIGNIAS (BADGES) ---
    // ¡REEMPLAZA ESTAS URLs con las de tus insignias de Minecraft!
    { id: 'badge_diamond_pickaxe', type: 'badge', name: 'Pico de Diamante', cost: 100, imageUrl: 'https://i.ibb.co/bj5zfsHd/PICO-removebg-preview.png' }, // Ejemplo: Un pico de diamante
    { id: 'badge_totem_amongus', type: 'badge', name: 'Totem Amongus', cost: 80, imageUrl: 'https://i.ibb.co/cV3ry0V/1000036820-removebg-preview.png' },
    { id: 'badge_ender_pearl', type: 'badge', name: 'Perla de Ender', cost: 150, imageUrl: 'https://i.ibb.co/Gfcf1qYG/PERLA-removebg-preview.png' }, // Ejemplo: Perla de Ender
    { id: 'badge_nether_star', type: 'badge', name: 'Estrella del Nether', cost: 200, imageUrl: 'https://i.ibb.co/Y7Wr8Qgn/NEHETER-removebg-preview.png' }, // Ejemplo: Estrella del Nether
    
    { id: 'badge_diamond', type: 'badge', name: 'Diamante', cost: 100, imageUrl: 'https://i.ibb.co/TMsYbX8D/1000036812-removebg-preview.png' }, // Ejemplo: Un pico de diamante
    { id: 'badge_creeper', type: 'badge', name: 'Creeper', cost: 80, imageUrl: 'https://i.ibb.co/Kcjm5KJ9/1000036817-removebg-preview.png' },
    { id: 'badge_enchated_apple', type: 'badge', name: 'Manzana Encantada', cost: 200, imageUrl: 'https://i.ibb.co/8L2Dkfzr/1000036815-removebg-preview.png' }, // Ejemplo: Perla de Ender
    { id: 'badge_fire', type: 'badge', name: 'Fuego', cost: 10, imageUrl: 'https://i.ibb.co/nsvy0H3h/1000036821-removebg-preview.png' }, // Ejemplo: Estrella del Nether

     { id: 'badge_hearts', type: 'badge', name: 'Corazones', cost: 100, imageUrl: 'https://i.ibb.co/fdKLR1mT/1000036816-removebg-preview.png' }, // Ejemplo: Un pico de diamante
    { id: 'badge_bucket_with_axolotl', type: 'badge', name: 'Cubeta con Ajolote', cost: 80, imageUrl: 'https://i.ibb.co/xqDDdCqK/1000036814-removebg-preview.png' },
    { id: 'badge_tnt', type: 'badge', name: 'TNT', cost: 150, imageUrl: 'https://i.ibb.co/N23D02gX/1000036818-removebg-preview.png' }, // Ejemplo: Perla de Ender
    { id: 'badge_bucket_with_water', type: 'badge', name: 'Cubeta con agua', cost: 10, imageUrl: 'https://i.ibb.co/5gHYWz6N/1000036819-removebg-preview.png' }, // Ejemplo: Estrella del Nether
];


// --- Elementos del DOM (declarados fuera para accesibilidad) ---
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

const profileBtn = document.getElementById('profileBtn');
const authContainer = document.getElementById('authContainer');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const authTitle = document.getElementById('authTitle');
const authForm = document.getElementById('authForm');
const registerFields = document.getElementById('registerFields');
const authUsernameInput = document.getElementById('authUsername');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const avatarSelection = document.getElementById('avatarSelection');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const togglePasswordBtn = document.querySelector('.password-input-container .toggle-password');

const userProfile = document.getElementById('userProfile');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const profileAvatar = document.getElementById('profileAvatar');
// ELIMINADO: const profileFrameDisplay = document.getElementById('profileFrameDisplay');
const profileUsername = document.getElementById('profileUsername');
const profileEmail = document.getElementById('profileEmail');
const profileDescription = document.getElementById('profileDescription');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profilePublicationsCount = document.getElementById('profilePublicationsCount');
const myPublicationsGrid = document.getElementById('myPublicationsGrid');
const myFavoritesGrid = document.getElementById('myFavoritesGrid');
const logoutBtn = document.getElementById('logoutBtn');
const profileAvatarSelection = document.getElementById('profileAvatarSelection');
const profileAvatarFile = document.getElementById('profileAvatarFile');
const profileCoinsDisplay = document.getElementById('profileCoinsDisplay');

// ELIMINADO: const currentFrameSelect = document.getElementById('currentFrameSelect');
const currentBannerSelect = document.getElementById('currentBannerSelect');
const currentSloganSelect = document.getElementById('currentSloganSelect');
const currentBadgeSelect = document.getElementById('currentBadgeSelect'); // NUEVO: Selector de insignias
const profileBannerDisplay = document.getElementById('profileBannerDisplay');
const profileSloganDisplay = document.getElementById('profileSloganDisplay');
const mainProfileBadgeDisplay = document.getElementById('mainProfileBadgeDisplay'); // NUEVO: Insignia en el hub principal
const profileBadgeDisplay = document.getElementById('profileBadgeDisplay'); // NUEVO: Insignia en el perfil de usuario

const topUsersBtn = document.getElementById('topUsersBtn');
const topUsersContainer = document.getElementById('topUsersContainer');
const closeTopUsersBtn = document.getElementById('closeTopUsersBtn');
const topUsersList = document.getElementById('topUsersList');

const trendsSection = document.getElementById('trends-section');
const trendsGrid = document.getElementById('trends-grid');
const trendsPaginationBtn = trendsSection.querySelector('.next-btn');

const minecraftDownloadsList = document.getElementById('minecraftDownloadsList');
const minecraftDownloadsSection = document.getElementById('minecraft-downloads-section');
const minecraftDownloadsPagination = document.getElementById('minecraftDownloadsPagination');

const shopBtn = document.getElementById('shopBtn');
const shopContainer = document.getElementById('shopContainer');
const closeShopBtn = document.getElementById('closeShopBtn');
const shopItemsGrid = document.getElementById('shopItemsGrid');
const shopUserCoins = document.getElementById('shopUserCoins');
const currencyDisplay = document.getElementById('currencyDisplay');

const viewProfileContainer = document.getElementById('viewProfileContainer');
const closeViewProfileBtn = document.getElementById('closeViewProfileBtn');
const viewProfileAvatar = document.getElementById('viewProfileAvatar');
// ELIMINADO: const viewProfileFrameDisplay = document.getElementById('viewProfileFrameDisplay');
const viewProfileUsername = document.getElementById('viewProfileUsername');
const viewProfileDescription = document.getElementById('viewProfileDescription');
const viewProfilePublicationsCount = document.getElementById('viewProfilePublicationsCount');
const viewProfilePublicationsGrid = document.getElementById('viewProfilePublicationsGrid');
const viewProfilePubsOfUser = document.getElementById('viewProfilePubsOfUser');
const viewProfileSloganDisplay = document.getElementById('viewProfileSloganDisplay'); // Eslogan en perfil de otros
const viewProfileBadgeDisplay = document.getElementById('viewProfileBadgeDisplay'); // NUEVO: Insignia en perfil de otros
const viewProfileBannerDisplay = document.getElementById('viewProfileBannerDisplay'); // NUEVO: Banner en perfil de otros


const themeToggleBtn = document.getElementById('themeToggleBtn');

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

// Función para actualizar las monedas en la interfaz principal
function updateCurrencyDisplay() {
    if (currentUserData) {
        document.getElementById('userCoins').textContent = currentUserData.coins || 0;
        currencyDisplay.style.display = 'flex'; // Asegurarse de que se muestra
    } else {
        currencyDisplay.style.display = 'none'; // Ocultar si no hay usuario
    }
}

function showAuthWarning(event) {
    event.preventDefault();
    alert('Debes iniciar sesión o registrarte para publicar contenido.');
    authContainer.style.display = 'flex';
    isRegisterMode = false;
    renderAuthForm();
}

let isRegisterMode = false; // Mover a ámbito global

function renderAuthForm() {
    if (isRegisterMode) {
        authTitle.textContent = 'Registrarse';
        authSubmitBtn.textContent = 'Registrarse';
        toggleAuthMode.textContent = '¿Ya tienes cuenta? Iniciar Sesión';
        registerFields.style.display = 'block';
    } else {
        authTitle.textContent = 'Iniciar Sesión';
        authSubmitBtn.textContent = 'Iniciar Sesión';
        toggleAuthMode.textContent = '¿No tienes cuenta? Regístrate';
        registerFields.style.display = 'none';
    }
}

// ELIMINADO: applyFrameToElement ya no se necesita

// Función para aplicar el estilo del banner
function applyBannerToElement(element, bannerId) {
    const bannerItem = SHOP_ITEMS.find(item => item.id === bannerId && item.type === 'banner');
    if (bannerItem && element) { // Asegurarse de que el elemento existe
        element.style.cssText = `background-image: url(${bannerItem.imageUrl}); ${bannerItem.style}`;
        element.style.display = 'block'; // Asegúrate de que el banner es visible
    } else if (element) {
        element.style.backgroundImage = 'none';
        element.style.cssText = ''; // Limpiar otros estilos aplicados
        element.style.display = 'none'; // Ocultar el banner si no hay ninguno
    }
}

// Función para aplicar el eslogan
function applySloganToElement(element, sloganId) {
    const sloganItem = SHOP_ITEMS.find(item => item.id === sloganId && item.type === 'slogan');
    if (sloganItem && element) { // Asegurarse de que el elemento existe
        element.textContent = sloganItem.text;
        element.style.cssText = sloganItem.style;
        element.style.display = 'block'; // Asegura que el eslogan es visible
    } else if (element) {
        element.textContent = '';
        element.style.cssText = '';
        element.style.display = 'none'; // Oculta el eslogan si no hay ninguno
    }
}

// NUEVO: Función para aplicar la insignia
function applyBadgeToElement(element, badgeId) {
    const badgeItem = SHOP_ITEMS.find(item => item.id === badgeId && item.type === 'badge');
    if (badgeItem && element) {
        element.style.backgroundImage = `url(${badgeItem.imageUrl})`;
        element.style.display = 'block'; // Asegúrate de que el elemento es visible
    } else if (element) {
        element.style.backgroundImage = 'none'; // Quita la insignia si no hay ninguna
        element.style.display = 'none'; // Oculta el elemento si no hay insignia
    }
}


async function loadUserProfile(uid) {
    try {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            currentUserData = {
                ...userData,
                purchasedItems: userData.purchasedItems || [] // Asegurar que existe
            };
            
            profileAvatar.src = userData.avatarURL || "https://i.imgur.com/gK103rS.png";
            profileUsername.textContent = userData.username || "Usuario";
            profileEmail.textContent = userData.email || "";
            profileDescription.value = userData.description || "";
            profilePublicationsCount.textContent = userData.publicationCount || 0;
            profileCoinsDisplay.innerHTML = `<i class="fas fa-coins"></i> ${userData.coins || 0} Monedas`;
            updateCurrencyDisplay(); // Actualizar display de monedas principal

            profileAvatarSelection.querySelectorAll('img').forEach(img => {
                if (img.dataset.avatarUrl === userData.avatarURL) {
                    img.classList.add('selected');
                } else {
                    img.classList.remove('selected');
                }
            });
            profileAvatarFile.value = '';
            
            // ELIMINADO: Cargar marcos (ya no se usa)
            // if (currentFrameSelect) { /* ... */ }

            // Cargar banners
            if (currentBannerSelect) {
                currentBannerSelect.innerHTML = '<option value="">Sin Banner</option>';
                const purchasedBanners = SHOP_ITEMS.filter(item => item.type === 'banner' && currentUserData.purchasedItems.includes(item.id));
                purchasedBanners.forEach(banner => {
                    const option = document.createElement('option');
                    option.value = banner.id;
                    option.textContent = banner.name;
                    currentBannerSelect.appendChild(option);
                });
                currentBannerSelect.value = currentUserData.currentBanner || '';
                applyBannerToElement(profileBannerDisplay, currentUserData.currentBanner || '');
            }

            // Cargar eslóganes
            if (currentSloganSelect) {
                currentSloganSelect.innerHTML = '<option value="">Sin Eslogan</option>';
                const purchasedSlogans = SHOP_ITEMS.filter(item => item.type === 'slogan' && currentUserData.purchasedItems.includes(item.id));
                purchasedSlogans.forEach(slogan => {
                    const option = document.createElement('option');
                    option.value = slogan.id;
                    option.textContent = slogan.name;
                    currentSloganSelect.appendChild(option);
                });
                currentSloganSelect.value = currentUserData.currentSlogan || '';
                applySloganToElement(profileSloganDisplay, currentUserData.currentSlogan || '');
            }

            // NUEVO: Cargar insignias
            if (currentBadgeSelect) {
                currentBadgeSelect.innerHTML = '<option value="">Sin Insignia</option>';
                const purchasedBadges = SHOP_ITEMS.filter(item => item.type === 'badge' && currentUserData.purchasedItems.includes(item.id));
                purchasedBadges.forEach(badge => {
                    const option = document.createElement('option');
                    option.value = badge.id;
                    option.textContent = badge.name;
                    currentBadgeSelect.appendChild(option);
                });
                currentBadgeSelect.value = userData.currentBadge || ''; // Asumiendo que guardas el ID de la insignia actual
                applyBadgeToElement(profileBadgeDisplay, userData.currentBadge || ''); // Aplica la insignia al elemento del perfil
                applyBadgeToElement(mainProfileBadgeDisplay, userData.currentBadge || ''); // Aplica la insignia al elemento del hub principal
            }

            await loadMyPublications(uid);
            await loadMyFavorites(uid, userData.favorites || []);
        } else {
            console.log("No se encontraron datos de usuario en Firestore para UID:", uid);
            alert("Tu perfil no tiene datos completos. Por favor, completa tu registro.");
        }
    } catch (error) {
        console.error("Error al cargar perfil de usuario:", error);
        alert("Error al cargar el perfil. Por favor, intenta de nuevo.");
    }
}

async function loadMyPublications(uid) {
    myPublicationsGrid.innerHTML = '';
    const q = query(collection(db, "contenidos"), where("userId", "==", uid), orderBy("fecha", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        myPublicationsGrid.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Aún no tienes publicaciones.</p>';
    } else {
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const card = document.createElement('div');
            card.className = 'my-publication-card';
            card.innerHTML = `
                <img src="${data.imagenURL || 'https://i.imgur.com/hUPXXQF.png'}" alt="${data.titulo}">
                <h4>${data.titulo}</h4>
                <p>${data.tipo}</p>
                <button class="delete-publication-btn" data-id="${docSnap.id}" data-image-url="${data.imagenURL}">🗑️</button>
            `;
            myPublicationsGrid.appendChild(card);

            card.querySelector('.delete-publication-btn').addEventListener('click', async (e) => {
                const contentId = e.target.dataset.id;
                const imageUrl = e.target.dataset.imageUrl;
                if (confirm('¿Estás seguro de que quieres eliminar esta publicación? Esta acción es irreversible.')) {
                    showLoading();
                    try {
                        if (imageUrl && imageUrl.startsWith('https://i.ibb.co/')) {
                            console.warn("No se puede eliminar la imagen de ImgBB directamente sin el hash de eliminación. Se eliminará solo el documento de Firestore.");
                        }

                        await deleteDoc(doc(db, "contenidos", contentId));

                        await updateDoc(doc(db, "users", uid), {
                            publicationCount: increment(-1)
                        });

                        hideLoading();
                        alert('Publicación eliminada correctamente.');
                        loadMyPublications(uid);
                        if (currentCategory && document.getElementById(`${currentCategory}-section`) && document.getElementById(`${currentCategory}-section`).classList.contains('active')) {
                            if (currentCategory === 'minecraft-downloads') {
                                loadMinecraftDownloads(null);
                            } else if (currentCategory === 'trends') {
                                loadTrends(null);
                            }
                            else if (currentCategory !== 'top') {
                                loadCategoryContent(currentCategory, null);
                            }
                        }
                    } catch (error) {
                        hideLoading();
                        console.error("Error al eliminar publicación:", error);
                        alert('Error al eliminar la publicación.');
                    }
                }
            });
        });
    }
}

async function loadMyFavorites(uid, favoriteIds) {
    myFavoritesGrid.innerHTML = '';
    if (favoriteIds.length === 0) {
        myFavoritesGrid.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Aún no has añadido favoritos.</p>';
        return;
    }

    try {
        const favoriteContentPromises = favoriteIds.map(id => getDoc(doc(db, "contenidos", id)));
        const favoriteContentSnaps = await Promise.all(favoriteContentPromises);

        let hasResults = false;
        for (const docSnap of favoriteContentSnaps) {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const card = document.createElement('div');
                card.className = 'my-favorite-card';
                card.innerHTML = `
                    <img src="${data.imagenURL || 'https://i.imgur.com/hUPXXQF.png'}" alt="${data.titulo}">
                    <h4>${data.titulo}</h4>
                    <p>${data.tipo}</p>
                `;
                myFavoritesGrid.appendChild(card);
                hasResults = true;
            }
        }

        if (!hasResults) {
            myFavoritesGrid.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">No se encontraron favoritos.</p>';
        }
    } catch (error) {
        console.error("Error al cargar favoritos:", error);
        myFavoritesGrid.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Error al cargar favoritos.</p>';
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
    
    if (currentUser) {
        localStorage.setItem(LAST_VISITED_KEY, Date.now().toString());
    } else if (!lastVisitedTime) {
            localStorage.setItem(LAST_VISITED_KEY, Date.now().toString());
    }
}

async function updateLastVisitedTime() {
    if (currentUser) {
        localStorage.setItem(LAST_VISITED_KEY, Date.now().toString());
    }
    await updateNewContentCount();
}

async function loadCategoryContent(category, lastDoc = null) {
    showLoading();
    currentCategory = category;

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    topUsersContainer.style.display = 'none';
    shopContainer.style.display = 'none';
    viewProfileContainer.style.display = 'none';
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
        }));
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
    topUsersContainer.style.display = 'none';
    shopContainer.style.display = 'none';
    viewProfileContainer.style.display = 'none';
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
    topUsersContainer.style.display = 'none';
    shopContainer.style.display = 'none';
    viewProfileContainer.style.display = 'none';
    mainHub.style.display = 'none';

    if (categoria === 'top') {
        showTopUsers();
    } else if (categoria === 'minecraft-downloads') {
        loadMinecraftDownloads();
    } else if (categoria === 'trends') {
        loadTrends();
    }
    else {
        loadCategoryContent(categoria);
    }
    updateLastVisitedTime();
}

function handleBackButtonClick(e) {
    if (e) e.preventDefault();
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    topUsersContainer.style.display = 'none';
    shopContainer.style.display = 'none';
    viewProfileContainer.style.display = 'none';
    mainHub.style.display = 'inline-block';
    currentCategory = '';
    updateLastVisitedTime();
}

async function createContentCard(contenido) {
    const versiones = Object.keys(contenido.versiones || {});
    const primeraVersion = versiones[0];
    const primerLink = contenido.versiones[primeraVersion];

    let publisherName = contenido.nombre || "Anónimo";
    let publisherAvatar = "https://i.imgur.com/gK103rS.png";
    let publisherSloganText = ''; // Texto del eslogan del publicador
    let publisherSloganStyle = ''; // Estilo del eslogan del publicador
    let publisherBadge = ''; // Insignia del publicador
    
    if (contenido.userId) {
        const userDoc = await getDoc(doc(db, "users", contenido.userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            publisherName = userData.username;
            publisherAvatar = userData.avatarURL || publisherAvatar;
            const sloganItem = SHOP_ITEMS.find(item => item.id === userData.currentSlogan && item.type === 'slogan');
            if (sloganItem) {
                publisherSloganText = sloganItem.text;
                publisherSloganStyle = sloganItem.style;
            }
            publisherBadge = userData.currentBadge ? (SHOP_ITEMS.find(item => item.id === userData.currentBadge && item.type === 'badge')?.imageUrl || '') : ''; // Obtener URL de la insignia
        }
    }

    let deleteButtonHtml = '';
    if (currentUser && currentUser.uid === ADMIN_UID) {
        deleteButtonHtml = `<button class="delete-content-btn" data-id="${contenido.id}" data-image-url="${contenido.imagenURL}">🗑️</button>`;
    }

    const card = document.createElement('div');
    card.className = 'content-card';
    card.innerHTML = `
        <img data-src="${contenido.imagenURL || 'https://i.imgur.com/hUPXXQF.png'}" alt="${contenido.titulo}" class="lazyload-img">
        <div class="card-body">
            ${deleteButtonHtml} <h3>${contenido.titulo}</h3>
            <p>${contenido.descripcion}</p>
            <p style="margin-bottom: 5px;"></p> <p><small>Publicado por: <span class="publisher-info" data-user-id="${contenido.userId}">${publisherName}</span>
            <span class="publisher-slogan" style="${publisherSloganStyle}">${publisherSloganText}</span>
            <div class="publisher-badge-display" style="background-image: url(${publisherBadge});"></div>
            </small></p>

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
    
    // Si hay insignia, asegúrate de que el div de la insignia se muestre
    const publisherBadgeDisplayElement = card.querySelector('.publisher-badge-display');
    if (publisherBadge && publisherBadgeDisplayElement) {
        publisherBadgeDisplayElement.style.display = 'block';
    } else if (publisherBadgeDisplayElement) {
        publisherBadgeDisplayElement.style.display = 'none';
    }


    const publisherInfoSpan = card.querySelector('.publisher-info');
    if (publisherInfoSpan && contenido.userId) {
        publisherInfoSpan.style.cursor = 'pointer';
        publisherInfoSpan.style.textDecoration = 'underline';
        publisherInfoSpan.style.color = 'var(--highlight-color)';
        publisherInfoSpan.addEventListener('click', async (e) => { // Agregado 'async' aquí
            e.stopPropagation();
            // Obtener datos del usuario para el eslogan y la insignia al hacer clic
            const userDataOnClick = await getUserData(contenido.userId);
            const sloganTextOnClick = userDataOnClick?.currentSlogan ? (SHOP_ITEMS.find(item => item.id === userDataOnClick.currentSlogan && item.type === 'slogan')?.text || '') : '';
            const badgeUrlOnClick = userDataOnClick?.currentBadge ? (SHOP_ITEMS.find(item => item.id === userDataOnClick.currentBadge && item.type === 'badge')?.imageUrl || '') : '';
            showUserProfileView(contenido.userId, publisherName, publisherAvatar, sloganTextOnClick, badgeUrlOnClick);
        });
    }
    
    const downloadButton = card.querySelector('.download-btn');
    downloadButton.addEventListener('click', async () => {
        // Lógica de descarga sin incremento de contador en Firestore
        if (!currentUser) {
            alert('Inicia sesión para registrar tu descarga y apoyar a los creadores!');
        }
    });


    const deleteButton = card.querySelector('.delete-content-btn');
    if (deleteButton) {
        deleteButton.addEventListener('click', async (e) => {
            const contentId = e.target.dataset.id;
            const imageUrl = e.target.dataset.imageUrl;

            if (confirm('¿Estás seguro de que quieres eliminar esta publicación? Esta acción es irreversible y afectará a todos los usuarios.')) {
                showLoading();
                try {
                    if (imageUrl && imageUrl.startsWith('https://i.ibb.co/')) {
                        console.warn("No se puede eliminar la imagen de ImgBB directamente sin el hash de eliminación. Se eliminará solo el documento de Firestore.");
                    }

                    const originalContentDocSnap = await getDoc(doc(db, "contenidos", contentId));
                    const originalContentData = originalContentDocSnap.exists() ? originalContentDocSnap.data() : null;

                    await deleteDoc(doc(db, "contenidos", contentId));

                    if (originalContentData && originalContentData.userId) {
                        await updateDoc(doc(db, "users", originalContentData.userId), {
                            publicationCount: increment(-1)
                        });
                    }

                    hideLoading();
                    alert('Publicación eliminada correctamente por el administrador.');
                    if (currentCategory && document.getElementById(`${currentCategory}-section`) && document.getElementById(`${currentCategory}-section`).classList.contains('active')) {
                        if (currentCategory === 'minecraft-downloads') {
                            loadMinecraftDownloads(null);
                        } else if (currentCategory === 'trends') {
                            loadTrends(null);
                        } else if (currentCategory !== 'top') {
                            loadCategoryContent(currentCategory, null);
                        }
                    }
                } catch (error) {
                    hideLoading();
                    console.error("Error al eliminar publicación:", error);
                    alert('Error al eliminar la publicación como administrador.');
                }
            }
        });
    }

    const likeBtn = card.querySelector('.like-btn');
    const likesCount = card.querySelector('.likes-count');
    const favoriteBtn = card.querySelector('.favorite-btn');

    const likedContents = JSON.parse(localStorage.getItem('likedContents') || '{}');
    if (likedContents[contenido.id]) {
        likeBtn.classList.add('liked');
    }

    likeBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Debes iniciar sesión para dar "like".');
            return;
        }

        if (likedContents[contenido.id]) {
            alert("Ya le has dado like a este contenido.");
            return;
        }

        try {
            await updateDoc(doc(db, "contenidos", contenido.id), {
                likes: increment(1)
            });

            likeBtn.classList.add('liked');
            likesCount.textContent = `${(contenido.likes || 0) + 1} likes`;
            likedContents[contenido.id] = true;
            localStorage.setItem('likedContents', JSON.stringify(likedContents));
        } catch (error) {
            console.error("Error al dar like:", error);
        }
    });

    if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists() && userDoc.data().favorites?.includes(contenido.id)) {
            favoriteBtn.classList.add('favorited');
            favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
        } else {
            favoriteBtn.innerHTML = '<i class="far fa-star"></i>';
        }
    } else {
        favoriteBtn.innerHTML = '<i class="far fa-star"></i>';
    }

    favoriteBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Debes iniciar sesión para añadir a favoritos.');
            return;
        }

        const contentId = contenido.id;
        const userDocRef = doc(db, "users", currentUser.uid);

        try {
            const userDocSnap = await getDoc(userDocRef);
            const favorites = userDocSnap.exists() ? (userDocSnap.data().favorites || []) : [];

            if (favorites.includes(contentId)) {
                await updateDoc(userDocRef, {
                    favorites: arrayRemove(contentId)
                });
                favoriteBtn.classList.remove('favorited');
                favoriteBtn.innerHTML = '<i class="far fa-star"></i>';
                alert('Eliminado de favoritos.');
            } else {
                await updateDoc(userDocRef, {
                    favorites: arrayUnion(contentId)
                });
                favoriteBtn.classList.add('favorited');
                favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
                alert('Añadido a favoritos.');
            }
            if (userProfile.style.display === 'flex') {
                await loadMyFavorites(currentUser.uid, favorites.includes(contentId) ? favorites.filter(id => id !== contentId) : [...favorites, contentId]);
            }
        } catch (error) {
            console.error("Error al gestionar favoritos:", error);
            alert('Error al gestionar favoritos. Intenta de nuevo.');
        }
    });

    const commentInput = card.querySelector('.comment-input');
    const commentSubmit = card.querySelector('.comment-submit');
    const commentsList = card.querySelector('.comments-list');
    const commentForm = card.querySelector('.comment-form');

    async function submitComment(parentId = null, replyToUser = '') {
        if (!currentUser) {
            alert('Debes iniciar sesión para comentar.');
            return;
        }

        let commentText = commentInput.value.trim();
        if (!commentText) return;

        if (replyToUser) {
            commentText = `@${replyToUser} ${commentText}`;
        }

        let authorName = "Anónimo";
        if (currentUser) {
            const userData = await getUserData(currentUser.uid);
            authorName = userData?.username || currentUser.email;
        }

        try {
            await addDoc(collection(db, "comentarios"), {
                contenidoId: contenido.id,
                autor: authorName,
                texto: commentText,
                fecha: serverTimestamp(),
                parentId: parentId
            });

            commentInput.value = '';
            if (commentInput.dataset.replyingTo) {
                commentInput.placeholder = 'Añade un comentario...';
                delete commentInput.dataset.replyingTo;
                delete commentInput.dataset.replyingToId;
            }

            loadComments(contenido.id, commentsList);
        } catch (error) {
            console.error("Error al enviar comentario:", error);
        }
    }

    // Define el listener base aquí
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
            const replyingToId = e.target.dataset.commentId;
            const replyingToAuthor = e.target.dataset.author;
            const form = e.target.closest('.comments-section').querySelector('.comment-form');
            const input = form.querySelector('.comment-input');
            const submitBtn = form.querySelector('.comment-submit');

            input.placeholder = `Respondiendo a ${replyingToAuthor}...`;
            input.dataset.replyingTo = replyingToAuthor;
            input.dataset.replyingToId = replyingToId;

            submitBtn.removeEventListener('click', submitCommentBaseListener);
            submitBtn.addEventListener('click', function replyListener() {
                submitComment(replyingToId, replyingToAuthor);
                input.placeholder = 'Añade un comentario...';
                delete input.dataset.replyingTo;
                delete input.dataset.replyingToId;
                submitBtn.removeEventListener('click', replyListener);
                submitBtn.addEventListener('click', submitCommentBaseListener);
            });
            input.focus();
        });

        const repliesContainer = commentElement.querySelector('.comment-replies');
        comment.replies.sort((a, b) => a.fecha.toDate() - b.fecha.toDate()).forEach(reply => renderComment(reply, repliesContainer));
    }

    rootComments.sort((a, b) => a.fecha.toDate() - b.fecha.toDate()).forEach(comment => renderComment(comment, container));
}

async function showTopUsers() {
    showLoading();
    topUsersList.innerHTML = '';
    currentCategory = 'top';
    try {
        const q = query(
            collection(db, "users"),
            orderBy("publicationCount", "desc"),
            limit(5)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            topUsersList.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">No hay usuarios en el top aún.</p>';
        } else {
            for (const docSnap of querySnapshot.docs) {
                const userData = docSnap.data();
                if (userData.username) {
                    const userCard = document.createElement('div');
                    userCard.className = 'user-card';
                    userCard.dataset.userId = docSnap.id;
                    
                    let userBadgeHtml = '';
                    // REVISADO: La insignia no debe mostrarse aquí por defecto, el CSS ya lo oculta con !important
                    // if (userData.currentBadge) {
                    //     const badgeItem = SHOP_ITEMS.find(item => item.id === userData.currentBadge && item.type === 'badge');
                    //     if (badgeItem) {
                    //         userBadgeHtml = `<div class="user-badge-display" style="background-image: url(${badgeItem.imageUrl});"></div>`;
                    //     }
                    // }

                    userCard.innerHTML = `
                        <img src="${userData.avatarURL || 'https://i.imgur.com/gK103rS.png'}" alt="Avatar">
                        <span>${userData.username}</span>
                        ${userBadgeHtml} <span class="publication-count">${userData.publicationCount || 0} publicaciones</span>
                    `;
                    topUsersList.appendChild(userCard);
                    
                    // REVISADO: Esta parte ya no es necesaria si el CSS usa !important para ocultarlo en el top
                    // const userBadgeDisplayElement = userCard.querySelector('.user-badge-display');
                    // if (userData.currentBadge && userBadgeDisplayElement) {
                    //     userBadgeDisplayElement.style.display = 'block';
                    // } else if (userBadgeDisplayElement) {
                    //     userBadgeDisplayElement.style.display = 'none';
                    // }

                    userCard.addEventListener('click', async () => { // Agregado 'async' aquí
                        // Pasar la insignia del usuario al abrir el perfil
                        const userDataOnClick = await getUserData(docSnap.id); // Vuelve a obtener los datos para asegurar la consistencia
                        const userSlogan = userDataOnClick?.currentSlogan ? (SHOP_ITEMS.find(item => item.id === userDataOnClick.currentSlogan && item.type === 'slogan')?.text || '') : '';
                        const userBadgeUrl = userDataOnClick?.currentBadge ? (SHOP_ITEMS.find(item => item.id === userDataOnClick.currentBadge && item.type === 'badge')?.imageUrl || '') : '';
                        showUserProfileView(docSnap.id, userData.username, userData.avatarURL, userSlogan, userBadgeUrl);
                    });
                }
            }
        }
        mainHub.style.display = 'none';
        topUsersContainer.style.display = 'flex';
        hideLoading();
    }
    catch (error) {
        hideLoading();
        console.error("Error al cargar el top de usuarios:", error);
        alert("Error al cargar el top de usuarios.");
    }
}

async function loadTrends(lastDoc = null) {
    showLoading();
    currentCategory = 'trends';

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    topUsersContainer.style.display = 'none';
    shopContainer.style.display = 'none';
    viewProfileContainer.style.display = 'none';
    mainHub.style.display = 'none';

    const grid = trendsGrid;
    if (!lastDoc) {
        grid.innerHTML = '';
    }

    let q = query(
        collection(db, "contenidos"),
        // Eliminado: orderBy("downloads", "desc")
        orderBy("fecha", "desc"), // Usar fecha si no hay descargas
        limit(pageSize)
    );

    if (lastDoc) {
        q = query(
            collection(db, "contenidos"),
            // Eliminado: orderBy("downloads", "desc")
            orderBy("fecha", "desc"), // Usar fecha si no hay descargas
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
        }));
        const cards = await Promise.all(cardPromises);
        cards.forEach(card => grid.appendChild(card));

        lastVisibleDocs['trends'] = documents[documents.length - 1];
        trendsPaginationBtn.style.display = 'inline-block';
    }

    trendsSection.classList.add('active');
    hideLoading();
}

async function loadShopItems() {
    shopItemsGrid.innerHTML = '';
    shopUserCoins.textContent = currentUserData?.coins || 0;

    SHOP_ITEMS.forEach(item => {
        const isPurchased = currentUserData?.purchasedItems?.includes(item.id);
        const itemCard = document.createElement('div');
        // Añadir clase para ítems de tipo badge para estilos específicos
        itemCard.className = `shop-item-card ${item.type}-item ${isPurchased ? 'purchased' : ''}`;
        
        let itemDisplay = '';
        // Para insignias y eslóganes, mostrar su contenido en lugar de una imagen genérica
        if (item.type === 'slogan') {
            itemDisplay = `<p class="shop-slogan-preview" style="${item.style}">${item.text}</p>`;
        } else { // Para banners y badges, usar img
            itemDisplay = `<img src="${item.imageUrl}" alt="${item.name}">`;
        }

        itemCard.innerHTML = `
            ${itemDisplay}
            <h4>${item.name}</h4>
            <p><i class="fas fa-coins"></i> ${item.cost}</p>
            <span class="purchased-tag">ADQUIRIDO</span>
        `;
        shopItemsGrid.appendChild(itemCard);

        if (!isPurchased) {
            itemCard.addEventListener('click', () => purchaseItem(item));
        }
    });
}

async function purchaseItem(item) {
    if (!currentUser) {
        alert('Debes iniciar sesión para comprar artículos.');
        return;
    }

    if (currentUserData.coins < item.cost) {
        alert('No tienes suficientes monedas para comprar este artículo.');
        return;
    }
    
    if (currentUserData.purchasedItems.includes(item.id)) {
        alert('Ya has comprado este artículo.');
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres comprar "${item.name}" por ${item.cost} monedas?`)) {
        return; // El usuario canceló la compra
    }

    showLoading();
    try {
        await runTransaction(db, async (transaction) => {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDocSnap = await transaction.get(userDocRef);

            if (!userDocSnap.exists()) {
                throw "Documento de usuario no existe!";
            }

            const currentCoins = userDocSnap.data().coins || 0;
            const purchasedItems = userDocSnap.data().purchasedItems || [];

            if (currentCoins < item.cost) {
                throw "No tienes suficientes monedas."; // Doble chequeo por concurrencia
            }
            if (purchasedItems.includes(item.id)) {
                throw "Ya has comprado este artículo."; // Doble chequeo por concurrencia
            }

            transaction.update(userDocRef, {
                coins: currentCoins - item.cost,
                purchasedItems: arrayUnion(item.id)
            });
        });

        hideLoading();
        alert(`¡Has comprado ${item.name} exitosamente!`);
        currentUserData.coins -= item.cost;
        currentUserData.purchasedItems.push(item.id);
        updateCurrencyDisplay();
        loadShopItems();
        if (userProfile.style.display === 'flex') {
            await loadUserProfile(currentUser.uid); // Recargar perfil para actualizar opciones de equipamiento
        }

    } catch (error) {
        hideLoading();
        console.error("Error al comprar artículo:", error);
        alert(`Error al comprar el artículo: ${error.message || error}`);
    }
}

async function showUserProfileView(uid, username, avatarURL, userSloganText, userBadgeUrl) { // Ahora recibe directamente el texto del eslogan y la URL de la insignia
    showLoading();
    mainHub.style.display = 'none';
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    topUsersContainer.style.display = 'none';
    shopContainer.style.display = 'none';

    viewProfileContainer.style.display = 'flex';
    viewProfileUsername.textContent = username;
    viewProfileAvatar.src = avatarURL || "https://i.imgur.com/gK103rS.png";
    // ELIMINADO: applyFrameToElement(viewProfileFrameDisplay, frameId);
    applyBadgeToElement(viewProfileBadgeDisplay, userBadgeUrl); // Aplica la insignia al perfil visto

    // APLICAR ESLOGAN
    // REVISADO: userSloganText ya es el texto, no se necesita buscar en SHOP_ITEMS por ID
    const sloganItem = SHOP_ITEMS.find(item => item.text === userSloganText && item.type === 'slogan'); // Buscamos el ID por el texto
    if (sloganItem) { // Si encontramos el item en SHOP_ITEMS
        applySloganToElement(viewProfileSloganDisplay, sloganItem.id); // Pasamos su ID para aplicar estilo
    } else {
        applySloganToElement(viewProfileSloganDisplay, ''); // Limpiar si no hay eslogan
    }

    viewProfilePubsOfUser.textContent = username;

    try {
        const userDocSnap = await getDoc(doc(db, "users", uid));
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            viewProfileDescription.textContent = userData.description || 'Este usuario no ha añadido una descripción.';
            viewProfilePublicationsCount.textContent = userData.publicationCount || 0;

            // Mostrar el banner del usuario visto (usando applyBannerToElement)
            applyBannerToElement(viewProfileBannerDisplay, userData.currentBanner || '');
            
        } else {
            viewProfileDescription.textContent = 'Usuario sin descripción.';
            viewProfilePublicationsCount.textContent = '0';
            if (viewProfileSloganDisplay) applySloganToElement(viewProfileSloganDisplay, ''); // Limpiar eslogan si no hay datos
            if (viewProfileBadgeDisplay) applyBadgeToElement(viewProfileBadgeDisplay, ''); // Limpiar insignia si no hay datos
            if (viewProfileBannerDisplay) applyBannerToElement(viewProfileBannerDisplay, ''); // Limpiar banner si no hay datos
        }

        viewProfilePublicationsGrid.innerHTML = '';
        const q = query(collection(db, "contenidos"), where("userId", "==", uid), orderBy("fecha", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            viewProfilePublicationsGrid.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Este usuario aún no tiene publicaciones.</p>';
        } else {
            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                const card = document.createElement('div');
                card.className = 'profile-publication-card';
                card.innerHTML = `
                    <img src="${data.imagenURL || 'https://i.imgur.com/hUPXXQF.png'}" alt="${data.titulo}">
                    <h4>${data.titulo}</h4>
                    <p>${data.tipo}</p>
                `;
                viewProfilePublicationsGrid.appendChild(card);
            });
        }

    } catch (error) {
        console.error("Error al cargar el perfil del otro usuario:", error);
        viewProfileDescription.textContent = 'Error al cargar los datos del perfil.';
        viewProfilePublicationsCount.textContent = 'Error';
        viewProfilePublicationsGrid.innerHTML = '<p style="text-align: center; color: var(--text-color-secondary);">Error al cargar las publicaciones de este usuario.</p>';
    } finally {
        hideLoading();
    }
}


async function getUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error("Error al obtener datos de usuario:", error);
        return null;
    }
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
        top: 'Top',
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
    if (currentUser && currentUser.uid === ADMIN_UID) {
        deleteBtnHtml = `<button class="delete-content-btn" data-id="${contentId}" data-image-url="">🗑️</button>`;
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
            if (confirm('¿Estás seguro de que quieres eliminar esta versión de Minecraft? Esto eliminará la publicación completa.')) {
                showLoading();
                try {
                    const originalContentDocSnap = await getDoc(doc(db, "contenidos", idToDelete));
                    const originalContentData = originalContentDocSnap.exists() ? originalContentDocSnap.data() : null;

                    await deleteDoc(doc(db, "contenidos", idToDelete));
                    if (originalContentData && originalContentData.userId) {
                        await updateDoc(doc(db, "users", originalContentData.userId), {
                            publicationCount: increment(-1)
                        });
                    }
                    hideLoading();
                    alert('Versión de Minecraft eliminada correctamente.');
                    loadMinecraftDownloads(null);
                } catch (error) {
                    hideLoading();
                    console.error("Error al eliminar versión de Minecraft como admin:", error);
                    alert('Error al eliminar la versión de Minecraft.');
                }
            }
        });
    }
    return item;
}

// --- DOMContentLoaded: Solo inicializaciones y EventListeners ---
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

    initializeTheme(); // Inicializar el tema

    const storedTime = localStorage.getItem('lastSubmissionTime');
    if (storedTime) {
        lastSubmissionTime = parseInt(storedTime, 10);
        updateCooldownMessage();
    }
    
    // Cargar y mostrar el contador de contenido nuevo
    await updateNewContentCount();
    setInterval(updateNewContentCount, 60 * 1000); // Actualizar cada minuto

    // --- Event Listeners para la interfaz ---
    profileBtn.addEventListener('click', async () => {
        if (currentUser) {
            showLoading();
            await loadUserProfile(currentUser.uid);
            hideLoading();
            userProfile.style.display = 'flex';
        } else {
            authContainer.style.display = 'flex';
            isRegisterMode = false;
            renderAuthForm();
        }
    });

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

    closeAuthBtn.addEventListener('click', () => { authContainer.style.display = 'none'; });
    closeProfileBtn.addEventListener('click', () => { userProfile.style.display = 'none'; });
    closeShopBtn.addEventListener('click', () => { shopContainer.style.display = 'none'; mainHub.style.display = 'inline-block'; });
    
    // AÑADIDO: Event Listener para el botón de cerrar del Top de Usuarios
    closeTopUsersBtn.addEventListener('click', () => {
        topUsersContainer.style.display = 'none';
        mainHub.style.display = 'inline-block'; // Vuelve al hub principal
    });

    closeViewProfileBtn.addEventListener('click', () => {
        viewProfileContainer.style.display = 'none';
        if (currentCategory && document.getElementById(`${currentCategory}-section`) && document.getElementById(`${currentCategory}-section`).classList.contains('active')) {
            document.getElementById(`${currentCategory}-section`).classList.add('active');
        } else {
            mainHub.style.display = 'inline-block';
        }
    });

    toggleAuthMode.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        renderAuthForm();
    });

    avatarSelection.querySelectorAll('img').forEach(img => {
        img.addEventListener('click', () => {
            avatarSelection.querySelectorAll('img').forEach(i => i.classList.remove('selected'));
            img.classList.add('selected');
            selectedAvatarUrl = img.dataset.avatarUrl;
        });
    });

    profileAvatarSelection.querySelectorAll('img').forEach(img => {
        img.addEventListener('click', () => {
            profileAvatarSelection.querySelectorAll('img').forEach(i => i.classList.remove('selected'));
            img.classList.add('selected');
            profileAvatar.src = img.dataset.avatarUrl;
            profileAvatarFile.value = '';
        });
    });

    profileAvatarFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profileAvatar.src = e.target.result;
                profileAvatarSelection.querySelectorAll('img').forEach(i => i.classList.remove('selected'));
            };
            reader.readAsDataURL(file);
        }
    });
    
    // ELIMINADO: EventListener para currentFrameSelect

    if (currentBannerSelect) {
        currentBannerSelect.addEventListener('change', async () => {
            if (currentUser) {
                const selectedBannerId = currentBannerSelect.value;
                await updateDoc(doc(db, "users", currentUser.uid), {
                    currentBanner: selectedBannerId
                });
                applyBannerToElement(profileBannerDisplay, selectedBannerId);
            }
        });
    }

    if (currentSloganSelect) {
        currentSloganSelect.addEventListener('change', async () => {
            if (currentUser) {
                const selectedSloganId = currentSloganSelect.value;
                await updateDoc(doc(db, "users", currentUser.uid), {
                    currentSlogan: selectedSloganId
                });
                applySloganToElement(profileSloganDisplay, selectedSloganId);
            }
        });
    }

    // NUEVO: EventListener para currentBadgeSelect
    if (currentBadgeSelect) {
        currentBadgeSelect.addEventListener('change', async () => {
            if (currentUser) {
                const selectedBadgeId = currentBadgeSelect.value;
                await updateDoc(doc(db, "users", currentUser.uid), {
                    currentBadge: selectedBadgeId // Guarda el ID de la insignia en el perfil
                });
                applyBadgeToElement(profileBadgeDisplay, selectedBadgeId); // Aplica la insignia al elemento del perfil
                applyBadgeToElement(mainProfileBadgeDisplay, selectedBadgeId); // Aplica la insignia al elemento del hub principal
            }
        });
    }


    togglePasswordBtn.addEventListener('click', () => {
        const type = authPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        authPasswordInput.setAttribute('type', type);
        togglePasswordBtn.querySelector('i').classList.toggle('fa-eye');
        togglePasswordBtn.querySelector('i').classList.toggle('fa-eye-slash');
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        const username = authUsernameInput.value.trim();

        if (isRegisterMode) {
            if (!username) {
                hideLoading();
                alert("Por favor, introduce un nombre de usuario.");
                return;
            }
            try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", username));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    hideLoading();
                    alert("Ese nombre de usuario ya está en uso. Por favor, elige otro.");
                    return;
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await setDoc(doc(db, "users", user.uid), {
                    username: username,
                    email: email,
                    avatarURL: selectedAvatarUrl,
                    description: "",
                    publicationCount: 0,
                    favorites: [],
                    coins: 150, // <<<-- CAMBIO AQUÍ: Nuevos usuarios obtienen 150 monedas
                    purchasedItems: [],
                    // ELIMINADO: currentFrame: '',
                    currentBanner: '',
                    currentSlogan: '',
                    currentBadge: '', // NUEVO: Inicializar la insignia
                    createdAt: serverTimestamp()
                });

                const contenidosRef = collection(db, "contenidos");
                const qContent = query(contenidosRef, where("nombre", "==", username));
                const contentSnapshot = await getDocs(qContent);

                for (const docSnapshot of contentSnapshot.docs) {
                    if (!docSnapshot.data().userId) {
                        await updateDoc(doc(db, "contenidos", docSnapshot.id), {
                            userId: user.uid
                        });
                        await updateDoc(doc(db, "users", user.uid), {
                            publicationCount: increment(1)
                        });
                    }
                }

                hideLoading();
                alert("¡Registro exitoso! Has iniciado sesión.");
                authContainer.style.display = 'none';
                authForm.reset();
            } catch (error) {
                hideLoading();
                console.error("Error al registrar:", error.message);
                alert(`Error al registrar: ${error.message}`);
            }
        } else {
            try {
                await signInWithEmailAndPassword(auth, email, password);
                hideLoading();
                alert("¡Inicio de sesión exitoso!");
                authContainer.style.display = 'none';
                authForm.reset();
            } catch (error) {
                hideLoading();
                console.error("Error al iniciar sesión:", error.message);
                alert(`Error al iniciar sesión: ${error.message}`);
            }
        }
    });

    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = authEmailInput.value;

        if (!email) {
            alert("Por favor, introduce tu correo electrónico en el campo de email para reestablecer la contraseña.");
            return;
        }

        showLoading();
        try {
            await sendPasswordResetEmail(auth, email);
            hideLoading();
            alert(`Se ha enviado un correo electrónico a ${email} con instrucciones para reestablecer tu contraseña. Revisa tu bandeja de entrada (y spam).`);
            authContainer.style.display = 'none';
        } catch (error) {
            hideLoading();
            console.error("Error al enviar correo de restablecimiento:", error.message);
            alert(`Error al enviar correo de restablecimiento: ${error.message}. Asegúrate de que el email es correcto y de que la cuenta existe.`);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        showLoading();
        try {
            await signOut(auth);
            hideLoading();
            alert("Has cerrado sesión.");
            userProfile.style.display = 'none';
            userNameInput.value = '';
            userNameInput.readOnly = false;
        } catch (error) {
            hideLoading();
            console.error("Error al cerrar sesión:", error.message);
            alert(`Error al cerrar sesión: ${error.message}`);
        }
    });

    saveProfileBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Debes iniciar sesión para guardar cambios en tu perfil.');
            return;
        }

        let newAvatarUrl = profileAvatar.src;

        if (profileAvatarFile.files.length > 0) {
            const file = profileAvatarFile.files[0];
            const toBase64 = f => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(f);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
            });

            showLoading();
            try {
                const base64 = await toBase64(file);
                const formData = new FormData();
                formData.append("key", "2f46a52689b8faf89cb1a670b25e89d5"); // Tu clave de ImgBB
                formData.append("image", base64);

                const res = await fetch("https://api.imgbb.com/1/upload", {
                    method: "POST",
                    body: formData
                });

                const dataImgBB = await res.json();
                if (!dataImgBB.data || !dataImgBB.data.url) {
                    throw new Error("Error al subir imagen a ImgBB: " + (dataImgBB.error?.message || "Error desconocido"));
                }
                newAvatarUrl = dataImgBB.data.url;
            } catch (err) {
                hideLoading();
                console.error("Error al subir nueva imagen de avatar:", err);
                alert(`Error al subir la imagen de avatar: ${err.message}`);
                return;
            }
        } else {
            const selectedImg = profileAvatarSelection.querySelector('img.selected');
            if (selectedImg) {
                newAvatarUrl = selectedImg.dataset.avatarUrl;
            }
        }

        try {
            // ELIMINADO: const selectedFrame = currentFrameSelect.value;
            const selectedBanner = currentBannerSelect ? currentBannerSelect.value : '';
            const selectedSlogan = currentSloganSelect ? currentSloganSelect.value : '';
            const selectedBadge = currentBadgeSelect ? currentBadgeSelect.value : ''; // NUEVO: Obtener la insignia seleccionada


            await updateDoc(doc(db, "users", currentUser.uid), {
                description: profileDescription.value.trim(),
                avatarURL: newAvatarUrl,
                // ELIMINADO: currentFrame: selectedFrame,
                currentBanner: selectedBanner,
                currentSlogan: selectedSlogan,
                currentBadge: selectedBadge // NUEVO: Guardar la insignia
            });
            hideLoading();
            alert("Cambios de perfil guardados exitosamente.");
            await loadUserProfile(currentUser.uid); // Recargar para actualizar la interfaz
        } catch (error) {
            hideLoading();
            console.error("Error al guardar descripción/avatar/banner/slogan/insignia:", error);
            alert("Error al guardar cambios en el perfil.");
        }
    });

    // --- Lógica del Hub y Publicación ---
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

        if (!currentUser) {
            alert('Debes iniciar sesión para publicar contenido.');
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

        if (contentType === 'minecraft-version' && currentUser.uid !== ADMIN_UID) {
            alert('Solo el administrador puede subir contenido de tipo "Minecraft Versión".');
            hideLoading();
            return;
        }

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
            reader.readAsDataURL(file); // Usar 'file' en lugar de 'f'
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
        });

        showLoading();
        try {
            const base64 = await toBase64(contentImageFile);
            const formData = new FormData();
            formData.append("key", "2f46a52689b8faf89cb1a670b25e89d5"); // Tu clave de ImgBB
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
            
            const coinsEarned = COINS_PER_CATEGORY[contentType] || 0;
            
            await runTransaction(db, async (transaction) => {
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await transaction.get(userDocRef);
                
                if (!userDocSnap.exists()) {
                    throw "Documento de usuario no existe!";
                }
                const currentCoins = userDocSnap.data().coins || 0;
                const currentPublications = userDocSnap.data().publicationCount || 0;

                transaction.update(userDocRef, { 
                    publicationCount: currentPublications + 1,
                    coins: currentCoins + coinsEarned
                });
                
                transaction.set(doc(collection(db, "contenidos")), {
                    nombre: userName,
                    userId: currentUser.uid,
                    titulo: contentTitle,
                    descripcion: contentDescription,
                    tipo: contentType,
                    versiones: versiones,
                    fecha: serverTimestamp(),
                    imagenURL: imagenURL,
                    vistas: 0,
                    likes: 0,
                    // Eliminado: downloads: 0
                });
            });


            lastSubmissionTime = currentTime;
            localStorage.setItem('lastSubmissionTime', currentTime.toString());
            updateCooldownMessage();
            
            await updateLastVisitedTime();

            hideLoading();
            alert(`¡Contenido publicado! Has ganado ${coinsEarned} monedas.`);
            contentFormOverlay.style.display = 'none';
            publishForm.reset();

            versionsContainer.innerHTML = `
                <div class="version-block">
                    <input type="text" name="version-name[]" placeholder="Nombre de versión (ej: 1.20)" required>
                    <input type="url" name="version-link[]" placeholder="Link de descarga (solo MediaFire)" required>
                </div>
            `;
            // Asegúrate de que el primer elemento 'removeVersionBtn' es añadido de nuevo si quieres que se pueda quitar
            const firstVersionBlock = versionsContainer.querySelector('.version-block');
            if (firstVersionBlock) {
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'removeVersionBtn';
                removeBtn.textContent = '❌ Quitar';
                removeBtn.addEventListener('click', () => {
                    firstVersionBlock.remove();
                });
                firstVersionBlock.appendChild(removeBtn);
            }


            const activeSection = document.querySelector('.content-section.active');
            if (activeSection) {
                const activeCategory = activeSection.id.replace('-section', '');
                if (activeCategory === 'minecraft-downloads') {
                    loadMinecraftDownloads(null);
                } else if (activeCategory === 'trends') {
                    loadTrends(null);
                }
                else if (activeCategory !== 'top') {
                    loadCategoryContent(activeCategory, null);
                }
            }
            if (currentUser) {
                await loadUserProfile(currentUser.uid);
            }
        } catch (err) {
            hideLoading();
            console.error("Error al publicar:", err);
            alert(`Error al publicar el contenido: ${err.message}`);
        }
    });
    
    // --- Cargar contenido inicial o hub principal
    mainHub.style.display = 'inline-block';

    // --- Event Listeners para botones de categoría ---
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

    shopBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Debes iniciar sesión para acceder a la tienda.');
            authContainer.style.display = 'flex';
            isRegisterMode = false;
            renderAuthForm();
            return;
        }
        showLoading();
        await loadShopItems();
        shopContainer.style.display = 'flex';
        mainHub.style.display = 'none';
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        topUsersContainer.style.display = 'none';
        viewProfileContainer.style.display = 'none';
        hideLoading();
    });

    // Escuchar cambios en el estado de autenticación (se mantiene aquí)
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            console.log("Usuario logueado UID:", currentUser.uid);
            currentUserData = await getUserData(user.uid); // Cargar los datos del usuario logueado
            userNameInput.value = currentUserData?.username || user.email;
            userNameInput.readOnly = true;
            publishContentBtn.style.display = 'inline-block';
            publishContentBtn.textContent = '⬇️ Publicar Contenido';
            profileBtn.innerHTML = '<i class="fas fa-user"></i>';
            authContainer.style.display = 'none';
            updateCurrencyDisplay();
            
            document.getElementById('mainProfileAvatar').src = currentUserData?.avatarURL || "https://i.imgur.com/gK103rS.png";
            // ELIMINADO: applyFrameToElement(document.getElementById('mainProfileFrame'), currentUserData?.currentFrame || '');
            applyBadgeToElement(mainProfileBadgeDisplay, currentUserData?.currentBadge || ''); // Aplica insignia en el hub principal

            publishContentBtn.removeEventListener('click', showAuthWarning);
            publishContentBtn.addEventListener('click', (event) => {
                event.preventDefault();
                contentFormOverlay.style.display = 'flex';
            });

            if (currentUser.uid === ADMIN_UID) {
                contentTypeSelect.querySelector('option[value="minecraft-version"]').style.display = 'block';
            } else {
                contentTypeSelect.querySelector('option[value="minecraft-version"]').style.display = 'none';
                if (contentTypeSelect.value === 'minecraft-version') {
                    contentTypeSelect.value = '';
                }
            }

        } else {
            console.log("No hay usuario logueado");
            currentUserData = null;
            userNameInput.value = '';
            userNameInput.readOnly = false;
            publishContentBtn.style.display = 'inline-block';
            publishContentBtn.textContent = '⬇️ Publicar Contenido (Requiere Inicio de Sesión)';
            profileBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
            authContainer.style.display = 'none';
            currencyDisplay.style.display = 'none';
            
            document.getElementById('mainProfileAvatar').src = "https://i.pinimg.com/736x/2d/b0/1d/2db01d6e21cba969c8363d2aa473c813.jpg";
            // ELIMINADO: document.getElementById('mainProfileFrame').style.backgroundImage = 'none';
            // ELIMINADO: document.getElementById('mainProfileFrame').style.border = 'none';
            // ELIMINADO: document.getElementById('mainProfileFrame').style.padding = '0';
            // ELIMINADO: document.getElementById('mainProfileFrame').style.boxShadow = 'none';
            
            // Quitar insignia del hub principal si no hay usuario
            if (mainProfileBadgeDisplay) {
                mainProfileBadgeDisplay.style.backgroundImage = 'none';
                mainProfileBadgeDisplay.style.display = 'none';
            }


            publishContentBtn.removeEventListener('click', (event) => {
                event.preventDefault();
                contentFormOverlay.style.display = 'flex';
            });
            publishContentBtn.addEventListener('click', showAuthWarning);

            contentTypeSelect.querySelector('option[value="minecraft-version"]').style.display = 'none';
            if (contentTypeSelect.value === 'minecraft-version') {
                contentTypeSelect.value = '';
            }
        }
        // Si hay una categoría activa, recárgala para mostrar/ocultar botones de eliminar admin
        if (currentCategory && document.getElementById(`${currentCategory}-section`) && document.getElementById(`${currentCategory}-section`).classList.contains('active')) {
            if (currentCategory === 'minecraft-downloads') {
                loadMinecraftDownloads(null);
            } else if (currentCategory === 'trends') {
                loadTrends(null);
            }
            else if (currentCategory !== 'top') {
                loadCategoryContent(currentCategory, null);
            }
        }
        // Asegúrate de que el contador de nuevo contenido se recalcule después de la autenticación
        await updateNewContentCount();
    });

});

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "",
    authDomain: "lost-and-found-a6dcc.firebaseapp.com",
    databaseURL: "https://lost-and-found-a6dcc-default-rtdb.firebaseio.com",
    projectId: "lost-and-found-a6dcc",
    storageBucket: "lost-and-found-a6dcc.firebasestorage.app",
    messagingSenderId: "589645131191",
    appId: "1:589645131191:web:7b0150a38f2e21bf1e0c32",
    measurementId: "G-ZL0JY7PE5K"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {

    // --- State Management ---
    let currentUser = null;
    let localItems = [];
    const today = new Date().toISOString().split("T")[0];

    // --- DOM Elements ---
    const btnAuthBtn = document.getElementById('btn-auth');
    const userProfileNav = document.getElementById('user-profile-nav');
    const navProfilePic = document.getElementById('nav-profile-pic');
    const navProfileName = document.getElementById('nav-profile-name');
    const profileDropdown = document.getElementById('profile-dropdown');
    const btnLogout = document.getElementById('btn-logout');

    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('form-auth');
    const signupExtra = document.getElementById('signup-extra');
    const authSwitchBtn = document.getElementById('auth-switch-btn');
    const authTitle = document.getElementById('auth-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchText = document.getElementById('auth-switch-text');
    const authError = document.getElementById('auth-error');
    const authSuccess = document.getElementById('auth-success');
    let isSignupMode = false;
    const lostDateInput = document.getElementById('lost-date');
    const foundDateInput = document.getElementById('found-date');

    // --- Shared validation/auth helpers ---
    function requireAuthForAction() {
        if (currentUser) return true;
        alert("Please login to continue");
        openAuthModal();
        return false;
    }

    function getItemOwnerId(item) {
        return item?.userId || item?.user_id || null;
    }

    function isCurrentUserOwner(item) {
        return Boolean(currentUser && getItemOwnerId(item) === currentUser.uid);
    }

    flatpickr(lostDateInput, {
        dateFormat: "d--m-Y",
        maxDate: "today",
        disableMobile: true
    });
    flatpickr(foundDateInput, {
        dateFormat: "d--m-Y",
        maxDate: "today",
        disableMobile: true
    });

    // --- UI Listeners & Scroll Logic ---
    const navbar = document.getElementById('navbar');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);

        let current = '';
        document.querySelectorAll('section').forEach(section => {
            if (scrollY >= section.offsetTop - 100) current = section.getAttribute('id');
        });
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) link.classList.add('active');
        });
    });

    // Toggle mobile menu
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('active');
    }));


    // --- Authentication ---
    userProfileNav.addEventListener('click', (e) => {
        if (e.target.id !== 'btn-logout' && e.target.tagName !== 'A') {
            profileDropdown.classList.toggle('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!userProfileNav.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    btnLogout.addEventListener('click', () => {
        signOut(auth).then(() => {
            alert("Logged out successfully.");
            profileDropdown.classList.add('hidden');
        }).catch(console.error);
    });

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            btnAuthBtn.classList.add('hidden');
            userProfileNav.classList.remove('hidden');
            navProfileName.textContent = user.displayName || user.email.split('@')[0];
            navProfilePic.src = user.photoURL || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(navProfileName.textContent) + '&background=random');
            closeAuthModal();
        } else {
            btnAuthBtn.classList.remove('hidden');
            userProfileNav.classList.add('hidden');
        }
        renderMyReports();
    });

    btnAuthBtn.addEventListener('click', () => {
        openAuthModal();
    });

    document.querySelectorAll('.auth-close').forEach(btn => btn.addEventListener('click', closeAuthModal));

    document.querySelectorAll('.edit-close').forEach(btn => btn.addEventListener('click', () => {
        document.getElementById('edit-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
    }));

    function openAuthModal() {
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        authError.classList.add('hidden');
        authSuccess.classList.add('hidden');
    }

    function closeAuthModal() {
        authModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        authForm.reset();
    }

    authSwitchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        if (isSignupMode) {
            signupExtra.classList.remove('hidden');
            document.getElementById('auth-confirm').required = true;
            authTitle.textContent = 'Student Signup';
            authSubmitBtn.textContent = 'Sign Up';
            authSwitchText.textContent = 'Already have an account?';
            authSwitchBtn.textContent = 'Login';
        } else {
            signupExtra.classList.add('hidden');
            document.getElementById('auth-confirm').required = false;
            authTitle.textContent = 'Student Login';
            authSubmitBtn.textContent = 'Login';
            authSwitchText.textContent = 'New student?';
            authSwitchBtn.textContent = 'Sign up';
        }
        authError.classList.add('hidden');
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.classList.add('hidden');
        authSuccess.classList.add('hidden');

        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const confirmResult = document.getElementById('auth-confirm').value;

        // Validation
        if (!email.endsWith('@vitstudent.ac.in')) {
            showAuthError("Only @vitstudent.ac.in emails are allowed.");
            return;
        }

        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Processing...';

        try {
            if (isSignupMode) {
                if (password !== confirmResult) throw new Error("Passwords do not match.");
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", cred.user.uid), {
                    uid: cred.user.uid,
                    email: cred.user.email,
                    createdAt: serverTimestamp()
                });
                authSuccess.textContent = "Account created successfully!";
                authSuccess.classList.remove('hidden');
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            showAuthError(error.message);
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isSignupMode ? 'Sign Up' : 'Login';
        }
    });

    // --- Google Auth ---
    const googleAuthBtn = document.getElementById('google-auth-btn');
    const googleProvider = new GoogleAuthProvider();

    googleAuthBtn.addEventListener('click', async () => {
        authError.classList.add('hidden');
        authSuccess.classList.add('hidden');

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Email Restriction
            if (!user.email.endsWith('@vitstudent.ac.in')) {
                await signOut(auth);
                showAuthError("Only @vitstudent.ac.in emails are allowed.");
                return;
            }

            // Store user in Firestore if not exists
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    name: user.displayName || "VIT Student",
                    email: user.email,
                    createdAt: serverTimestamp()
                });
            }

            closeAuthModal();
        } catch (error) {
            console.error("Google Auth Error:", error);
            showAuthError(error.message);
        }
    });


    function showAuthError(msg) {
        authError.textContent = msg;
        authError.classList.remove('hidden');
    }

    // --- Real-time Data Fetching & Rendering ---
    const itemGrid = document.getElementById('item-grid');
    let unsubscribeItems = null;

    function attachItemsListener() {
        if (unsubscribeItems) unsubscribeItems(); // clear previous if any

        const itemsQuery = query(collection(db, "items"), orderBy("createdAt", "desc"));
        unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
            const items = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            localItems = items;
            filterData();
            renderMyReports();
        }, (error) => {
            console.error("Error fetching items real-time: ", error);
            itemGrid.innerHTML = '<p class="text-muted" style="text-align:center;">Unable to load items right now. Please try again.</p>';
        });
    }

    function detachItemsListener() {
        if (unsubscribeItems) {
            unsubscribeItems();
            unsubscribeItems = null;
        }
        localItems = [];
        itemGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 1rem;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <p class="text-muted" style="font-size: 1.25rem; font-weight: 500;">Please log in to view and search items.</p>
            </div>`;
    }

    function renderItems(items) {
        itemGrid.innerHTML = '';
        if (items.length === 0) {
            itemGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 1rem;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p class="text-muted" style="font-size: 1.25rem; font-weight: 500;">No items found</p>
                </div>`;
            return;
        }

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            const imgPath = item.img_url || 'https://images.unsplash.com/photo-1584433144859-1cb3ea0acdd7?auto=format&fit=crop&q=80&w=400';

            const isOwner = isCurrentUserOwner(item);

            card.innerHTML = `
                <div class="item-img-container">
                    <img src="${imgPath}" alt="${item.item_name}" class="item-img" loading="lazy">
                </div>
                <div class="item-details">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <span class="badge ${item.type}">${item.type.toUpperCase()}</span>
                        ${isOwner ? `
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn-edit" data-id="${item.id}" style="background:none; border:none; color:var(--primary); cursor:pointer; padding:0.2rem;" aria-label="Edit Item" title="Edit Item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-delete" data-id="${item.id}" style="background:none; border:none; color:var(--danger); cursor:pointer; padding:0.2rem;" aria-label="Delete Item" title="Delete Item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>` : ''}
                    </div>
                    <h3 class="item-title">${item.item_name}</h3>
                    <div class="item-meta"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${item.location}</div>
                    <div class="item-meta"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${item.date}</div>
                    <div class="item-meta" style="margin-top: 0.5rem; color: var(--secondary);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><span style="font-weight: 600;">Contact: ${item.phone}</span></div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-block btn-call ripple" data-phone="${item.phone}">Call Contact</button>
                    </div>
                </div>
            `;
            itemGrid.appendChild(card);
        });

        document.querySelectorAll('.btn-call').forEach(btn => btn.addEventListener('click', (e) => {
            if (!requireAuthForAction()) return;
            window.location.href = 'tel:' + e.currentTarget.dataset.phone;
        }));

        document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => {
            const itemId = e.currentTarget.dataset.id;
            const itemData = localItems.find(i => i.id === itemId);
            if (itemData) {
                document.getElementById('edit-id').value = itemData.id;
                document.getElementById('edit-name').value = itemData.item_name;
                document.getElementById('edit-desc').value = itemData.description;
                document.getElementById('edit-location').value = itemData.location;
                document.getElementById('edit-phone').value = itemData.phone;
                document.getElementById('edit-error').classList.add('hidden');
                document.getElementById('edit-success').classList.add('hidden');

                document.getElementById('edit-modal').classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }));

        document.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async (e) => {
            if (confirm("Are you sure you want to completely delete this report?")) {
                const itemId = e.currentTarget.dataset.id;
                const itemData = localItems.find(i => i.id === itemId);

                if (!requireAuthForAction()) return;

                if (!itemData || !isCurrentUserOwner(itemData)) {
                    alert("You can only delete your own items");
                    return;
                }

                try {
                    // Remove image from Firebase Storage if it exists
                    if (itemData.img_path_ref) {
                        try {
                            const imgRef = ref(storage, itemData.img_path_ref);
                            await deleteObject(imgRef);
                        } catch (storageErr) {
                            console.warn("Storage item ignored or already deleted:", storageErr);
                        }
                    }
                    // Remove item from Firestore
                    await deleteDoc(doc(db, "items", itemId));
                    alert("Item deleted completely.");
                } catch (err) {
                    alert("Error removing item: " + err.message);
                }
            }
        }));
    }

    // --- Form Edit Handler ---
    document.getElementById('form-edit').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!requireAuthForAction()) return;

        const itemId = document.getElementById('edit-id').value;
        const btn = document.getElementById('edit-submit-btn');
        const originalText = btn.textContent;

        btn.disabled = true;
        btn.textContent = 'Saving...';
        document.getElementById('edit-error').classList.add('hidden');
        document.getElementById('edit-success').classList.add('hidden');

        try {
            await updateDoc(doc(db, "items", itemId), {
                item_name: document.getElementById('edit-name').value.trim(),
                description: document.getElementById('edit-desc').value.trim(),
                location: document.getElementById('edit-location').value.trim(),
                phone: document.getElementById('edit-phone').value.trim()
            });
            document.getElementById('edit-success').classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('edit-modal').classList.remove('active');
                document.body.style.overflow = 'auto';
            }, 1000);
        } catch (err) {
            document.getElementById('edit-error').textContent = err.message;
            document.getElementById('edit-error').classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    // --- Search & Filtering ---
    const searchInput = document.getElementById('search-input');
    const filterStatus = document.getElementById('filter-status');
    const filterCategory = document.getElementById('filter-category');

    function filterData() {
        const queryStr = searchInput.value.toLowerCase();
        const status = filterStatus.value;
        const category = filterCategory.value;

        const filtered = localItems.filter(item => {
            const matchQuery = item.item_name.toLowerCase().includes(queryStr) || item.location.toLowerCase().includes(queryStr) || item.description.toLowerCase().includes(queryStr);
            const matchStatus = status === 'all' || item.type === status;
            const matchCategory = category === 'all' || item.category === category;
            return matchQuery && matchStatus && matchCategory;
        });
        renderItems(filtered);
    }

    searchInput.addEventListener('input', filterData);
    filterStatus.addEventListener('change', filterData);
    filterCategory.addEventListener('change', filterData);


    async function renderMyReports() {
        const myReportsList = document.getElementById('my-reports-list');
        myReportsList.innerHTML = '';

        if (!currentUser) {
            myReportsList.innerHTML = '<p class="text-muted" style="text-align: center;">Please Login to view your personal reports.</p>';
            return;
        }

        try {
            const userItems = localItems.filter(item => isCurrentUserOwner(item));

            if (userItems.length === 0) {
                myReportsList.innerHTML = '<p class="text-muted" style="text-align: center;">You have not reported any items yet.</p>';
                return;
            }

            userItems.forEach(rep => {
                const el = document.createElement('div');
                el.className = 'my-report-item hover-lift';
                el.innerHTML = `
                    <div>
                        <h4 style="margin-bottom: 0.25rem;">${rep.item_name} <span class="badge ${rep.type}" style="font-size: 0.6rem; padding: 0.2rem 0.6rem; margin-left: 0.5rem; margin-bottom:0;">${rep.type.toUpperCase()}</span></h4>
                        <div class="text-muted" style="font-size: 0.85rem;">Reported on: ${rep.date}</div>
                    </div>
                    <div>
                        <strong style="color: var(--text-muted)">Active</strong>
                    </div>
                `;
                myReportsList.appendChild(el);
            });
        } catch (err) {
            console.error("Firestore query error:", err);
            myReportsList.innerHTML = '<p class="text-muted" style="text-align: center; color: var(--danger);">Failed to fetch reports. Please try again.</p>';
        }
    }

    // --- Image Upload Logic ---
    async function uploadImageFetchUrl(file) {
        if (!file) return { url: null, path: null };
        const fileName = `${Date.now()}_${file.name}`;
        const path = `images/${fileName}`;
        const storageRef = ref(storage, path);
        const uploadTask = await uploadBytesResumable(storageRef, file);
        const url = await getDownloadURL(uploadTask.ref);
        return { url, path };
    }

    // --- Form Submission Handlers ---
    async function handleFormSubmit(e, typeStr, prefix) {
        e.preventDefault();

        if (!requireAuthForAction()) {
            return;
        }

        const dateInput = document.getElementById(`${prefix}-date`);
        if (!dateInput.value) return;

        const btn = e.target.querySelector('button');
        const msg = e.target.querySelector('.form-message');
        const originalText = btn.textContent;
        const formElement = e.target;

        btn.textContent = 'Uploading image & saving...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        try {
            const fileInput = document.getElementById(`${prefix}-image`);
            const file = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;
            const uploadData = await uploadImageFetchUrl(file);

            await addDoc(collection(db, "items"), {
                item_name: document.getElementById(`${prefix}-name`).value.trim(),
                category: document.getElementById(`${prefix}-category`).value,
                description: document.getElementById(`${prefix}-desc`).value.trim(),
                location: document.getElementById(`${prefix}-location`).value.trim(),
                date: document.getElementById(`${prefix}-date`).value,
                phone: document.getElementById(`${prefix}-phone`).value.trim(),
                type: typeStr,
                img_url: uploadData.url,
                img_path_ref: uploadData.path,
                userId: auth.currentUser.uid,

                user_id: auth.currentUser.uid,   // 🔥 IMPORTANT
                user_email: auth.currentUser.email,

                createdAt: serverTimestamp()
            });

            formElement.reset();

            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.opacity = '1';

            msg.textContent = "Report Submitted Successfully!";
            msg.className = "form-message success-msg";
            msg.style.display = 'block';
            setTimeout(() => msg.style.display = 'none', 5000);

        } catch (error) {
            console.error("Database or Upload Error:", error);
            alert("An error occurred during submission: " + error.message);
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

    document.getElementById('form-lost').addEventListener('submit', (e) => handleFormSubmit(e, 'lost', 'lost'));
    document.getElementById('form-found').addEventListener('submit', (e) => handleFormSubmit(e, 'found', 'found'));
    attachItemsListener();
});

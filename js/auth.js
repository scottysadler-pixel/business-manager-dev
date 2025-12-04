import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { showToast } from './utils.js';

// WHITELIST - Only these emails can use the app
const ALLOWED_EMAILS = [
    'admin@mrcybersafe.com.au'
];

let currentUser = null;

export function init() {
    console.log('[Auth] Initializing...');
    
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Hide signup form - only admin can access
    document.getElementById('showSignup').style.display = 'none';
    document.querySelector('#loginForm p').style.display = 'none';
    
    // Form switching (keep for future if needed)
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    });
    
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });
    
    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Validate inputs
        if (!email || !password) {
            showToast('Please enter email and password', 'error');
            return;
        }
        
        // Check if email is allowed
        if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
            showToast('Access denied. You are not authorized to use this application.', 'error');
            return;
        }
        
        try {
            await signInWithEmailAndPassword(window.firebaseAuth, email, password);
            showToast('Logged in successfully', 'success');
        } catch (error) {
            console.error('Login error:', error);
            showToast(getErrorMessage(error.code), 'error');
        }
    });
    
    // Signup (disabled but kept for structure)
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupPasswordConfirm').value;
        
        // Check if email is allowed
        if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
            showToast('Access denied. Registration is restricted.', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            showToast('Account created successfully', 'success');
        } catch (error) {
            console.error('Signup error:', error);
            showToast(getErrorMessage(error.code), 'error');
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(window.firebaseAuth);
            showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error logging out', 'error');
        }
    });
    
    // Auth state observer
    onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
            // Double-check email is allowed
            if (!ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
                console.error('[Auth] Unauthorized email detected:', user.email);
                signOut(window.firebaseAuth);
                showToast('Access denied. Unauthorized account.', 'error');
                return;
            }
            
            currentUser = user;
            console.log('[Auth] User logged in:', user.email);
            showApp();
        } else {
            currentUser = null;
            console.log('[Auth] User logged out');
            showLogin();
        }
    });
}

function showLogin() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    
    // Load logo on login screen
    loadLoginLogo();
}

function showApp() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    
    // Trigger data load
    window.dispatchEvent(new CustomEvent('userLoggedIn'));
}

function loadLoginLogo() {
    try {
        // Check if logo is in localStorage
        const localProfile = localStorage.getItem('businessManager_businessProfile');
        if (localProfile) {
            const profile = JSON.parse(localProfile);
            if (profile.logoDataUrl) {
                const logoContainer = document.getElementById('loginLogo');
                if (logoContainer) {
                    logoContainer.innerHTML = `<img src="${profile.logoDataUrl}" alt="Business Logo">`;
                }
            }
        }
    } catch (error) {
        console.log('[Login] No logo available');
    }
}

export function getCurrentUser() {
    return currentUser;
}

export function getUserId() {
    return currentUser ? currentUser.uid : null;
}

function getErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'Email already in use',
        'auth/invalid-email': 'Invalid email address',
        'auth/user-not-found': 'Invalid email or password',
        'auth/wrong-password': 'Invalid email or password',
        'auth/weak-password': 'Password is too weak',
        'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/missing-password': 'Please enter a password',
    };
    return messages[code] || 'Login failed. Please check your credentials.';
}
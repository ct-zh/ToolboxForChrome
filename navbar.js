// navbar.js
function setupNavbar() {
    document.getElementById('homeButton').addEventListener('click', () => {
        window.parent.postMessage({ type: 'goHome' }, '*');
    });
}

// Function to set the title of the navbar
function setNavbarTitle(title) {
    document.getElementById('navbarTitle').innerText = title;
}

// Initialize navbar when loaded
setupNavbar();

// Listen for messages from parent window (e.g., iframe parent)
window.addEventListener('message', (event) => {
    // Ensure the message is from a trusted origin if deployed in a real environment
    // For local development and extension context, '*' is often used.
    if (event.data && event.data.type === 'setTitle') {
        setNavbarTitle(event.data.title);
    }
});
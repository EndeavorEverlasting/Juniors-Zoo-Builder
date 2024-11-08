let gameState = {
    currency: 100,
    buildings: {
        cage: { count: 0, cost: 100, word: 'CAGE', income: 1 },
        habitat: { count: 0, cost: 250, word: 'HABITAT', income: 2 },
        safari: { count: 0, cost: 500, word: 'SAFARI', income: 5 }
    },
    currentWord: '',
    typingProgress: '',
    hasStartedTyping: false,
    buildingGrid: [],
    wrongChar: null,
    gridSize: { rows: 3, cols: 8 },
    nextGridPos: { row: 0, col: 0 }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const typingHint = document.getElementById('typing-hint');
const keyboardIcon = document.getElementById('keyboard-icon');
const nextKeyHint = document.getElementById('next-key-hint');
const nextKey = document.getElementById('next-key');
const floatingGuide = document.getElementById('floating-guide');
const bounceArrow = document.getElementById('bounce-arrow');

// Animation properties
const GRID_CELL_SIZE = 80;
const BUILDING_SIZE = 60;

let virtualKeyboard = {
    visible: false,
    keys: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    container: null
};

function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
}

function createVirtualKeyboard() {
    virtualKeyboard.container = document.createElement('div');
    virtualKeyboard.container.className = 'virtual-keyboard';
    virtualKeyboard.container.style.display = 'none';
    
    const keyboardLayout = document.createElement('div');
    keyboardLayout.className = 'keyboard-layout';
    
    virtualKeyboard.keys.forEach(key => {
        const keyButton = document.createElement('button');
        keyButton.className = 'keyboard-key';
        keyButton.textContent = key;
        keyButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleKeyPress({ key });
        });
        keyboardLayout.appendChild(keyButton);
    });
    
    virtualKeyboard.container.appendChild(keyboardLayout);
    document.body.appendChild(virtualKeyboard.container);
}

function toggleVirtualKeyboard(show) {
    if (!virtualKeyboard.container) {
        createVirtualKeyboard();
    }
    virtualKeyboard.visible = show;
    virtualKeyboard.container.style.display = show ? 'block' : 'none';
    
    if (show) {
        document.body.classList.add('keyboard-visible');
    } else {
        document.body.classList.remove('keyboard-visible');
    }
}

function updateUIElementsPosition() {
    const typingHint = document.getElementById('typing-hint');
    const keyboardIcon = document.getElementById('keyboard-icon');
    
    if (isMobileDevice()) {
        typingHint.style.fontSize = '1rem';
        typingHint.style.padding = '10px 20px';
        keyboardIcon.style.fontSize = '1.5rem';
    } else {
        typingHint.style.fontSize = '1.4rem';
        typingHint.style.padding = '15px 30px';
        keyboardIcon.style.fontSize = '2rem';
    }
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const displayWidth = container.clientWidth;
    const displayHeight = isMobileDevice() ? window.innerHeight * 0.4 : 400;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        
        gameState.gridSize.cols = Math.floor(displayWidth / GRID_CELL_SIZE);
        gameState.gridSize.rows = Math.floor(displayHeight * 0.3 / GRID_CELL_SIZE);
        
        updateUIElementsPosition();
    }
}

// Existing functions from the original code (updateAvailableBuildings, showTypingStarted, etc.)
// ... [rest of the original functions]

function handleKeyPress(event) {
    const key = event.key.toUpperCase();
    
    if (typeof audioContext === 'undefined') {
        initAudioContext();
    }

    showTypingStarted();
    
    if (!gameState.currentWord) {
        for (const [buildingType, building] of Object.entries(gameState.buildings)) {
            if (building.word.startsWith(key) && gameState.currency >= building.cost) {
                gameState.currentWord = building.word;
                gameState.typingProgress = key;
                gameState.wrongChar = null;
                playCorrectKeySound();
                break;
            }
        }
    } else {
        // Existing handleKeyPress logic
        // ... [rest of the existing implementation]
    }
    
    updateDisplay();
    updateAvailableBuildings();
}

// Add touch event listeners
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameState.hasStartedTyping) {
        showTypingStarted();
        toggleVirtualKeyboard(true);
    }
});

// Add CSS for mobile support
const style = document.createElement('style');
style.textContent = `
    .virtual-keyboard {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--bs-dark);
        padding: 10px;
        z-index: 1000;
        border-top: 2px solid var(--bs-secondary);
    }
    
    .keyboard-layout {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 5px;
        max-width: 600px;
        margin: 0 auto;
    }
    
    .keyboard-key {
        background: var(--bs-secondary);
        border: none;
        border-radius: 5px;
        padding: 10px;
        color: var(--bs-light);
        font-size: 1.2rem;
        touch-action: manipulation;
    }
    
    .keyboard-key:active {
        background: var(--bs-primary);
    }
    
    .keyboard-visible .canvas-container {
        margin-bottom: 200px;
    }
    
    @media (max-width: 768px) {
        .typing-hint {
            font-size: 1rem !important;
            padding: 10px 20px !important;
        }
        
        .building-item {
            padding: 0.8rem;
        }
        
        .building-item h5 {
            font-size: 1.2rem;
        }
    }
`;
document.head.appendChild(style);

// Initialize the game
document.addEventListener('keypress', handleKeyPress);
window.addEventListener('load', () => {
    resizeCanvas();
    initGameState();
    if (isMobileDevice()) {
        createVirtualKeyboard();
        updateUIElementsPosition();
    }
    gameLoop();
});

window.addEventListener('resize', () => {
    resizeCanvas();
    updateUIElementsPosition();
});
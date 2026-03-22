// Game State
const gameState = {
    resources: 0,
    clickPower: 1,
    perSecond: 0,
    level: 1,
    totalClicks: 0,
    totalGenerated: 0,
    upgradesPurchased: 0,
    startTime: Date.now(),
    upgrades: [],
    generators: [],
    generatorData: {}
};

// Configuration
const CONFIG = {
    INITIAL_UPGRADES: 5,
    UPGRADES_TO_GENERATE: 5,
    HF_API_KEY: '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', // Using a free/demo key
    BASE_UPGRADE_COST: 10,
    COST_MULTIPLIER: 1.15
};

// Free AI Model (using Hugging Face Inference API - requires no setup!)
async function generateUpgradeName(upgradeLevel) {
    const prompt = `Generate a short, creative name for a technology upgrade (2-4 words). 
    This is upgrade level ${upgradeLevel} in an idle game.
    Be creative and unique! Just return the name, nothing else.`;
    
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
            headers: { Authorization: `Bearer ${CONFIG.HF_API_KEY}` },
            method: 'POST',
            body: JSON.stringify({ inputs: prompt }),
        });
        
        if (!response.ok) {
            throw new Error('API Error');
        }
        
        const data = await response.json();
        const text = data[0]?.generated_text || 'Mystery Upgrade';
        return text.split('\n')[0].trim().substring(0, 50) || 'Mysterious Tech';
    } catch (error) {
        console.warn('AI Generation failed, using fallback:', error);
        return generateFallbackName(upgradeLevel);
    }
}

async function generateUpgradeDescription(name, effect) {
    const prompt = `Write a brief, game-like description (1 sentence) for an upgrade called "${name}" that ${effect}. Be creative!`;
    
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
            headers: { Authorization: `Bearer ${CONFIG.HF_API_KEY}` },
            method: 'POST',
            body: JSON.stringify({ inputs: prompt }),
        });
        
        if (!response.ok) {
            throw new Error('API Error');
        }
        
        const data = await response.json();
        const text = data[0]?.generated_text || 'A mysterious upgrade awaits...';
        return text.split('\n')[0].trim().substring(0, 150) || 'A mysterious upgrade awaits...';
    } catch (error) {
        console.warn('AI Generation failed, using fallback:', error);
        return generateFallbackDescription(effect);
    }
}

// Fallback names (in case AI API fails)
function generateFallbackName(level) {
    const prefixes = ['Quantum', 'Neural', 'Cosmic', 'Atomic', 'Digital', 'Cyber', 'Ultra', 'Mega', 'Hyper', 'Nano'];
    const suffixes = ['Engine', 'Core', 'Matrix', 'Nexus', 'Protocol', 'System', 'Framework', 'Network', 'Flux', 'Drive'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix} ${suffix} v${level}`;
}

function generateFallbackDescription(effect) {
    const descriptions = [
        `Dramatically increases your ${effect}.`,
        `Enhances ${effect} by leaps and bounds.`,
        `Revolutionizes your approach to ${effect}.`,
        `Unlocks the true potential of ${effect}.`,
        `Supercharges ${effect} with advanced technology.`
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
}

// Upgrade Effects
const upgradeEffects = [
    {
        name: '+5% Click Power',
        effect: 'increases your click power',
        apply: () => { gameState.clickPower *= 1.05; updateClickInfo(); }
    },
    {
        name: '+2 Per Second',
        effect: 'generates passive income',
        apply: () => { gameState.perSecond += 2; }
    },
    {
        name: '+10% Per Second',
        effect: 'boosts passive generation',
        apply: () => { gameState.perSecond *= 1.1; }
    },
    {
        name: 'Double Click Power',
        effect: 'doubles your clicking ability',
        apply: () => { gameState.clickPower *= 2; updateClickInfo(); }
    },
    {
        name: '+1 Generator',
        effect: 'adds an automated resource generator',
        apply: () => {
            const generatorId = `generator_${Date.now()}`;
            gameState.generatorData[generatorId] = {
                name: `Auto Collector ${Object.keys(gameState.generatorData).length + 1}`,
                perSecond: gameState.perSecond || 1,
                active: true
            };
            gameState.generators.push(generatorId);
            renderGenerators();
        }
    },
    {
        name: '+25% Generator Output',
        effect: 'increases all generator effectiveness',
        apply: () => {
            gameState.generators.forEach(id => {
                if (gameState.generatorData[id]) {
                    gameState.generatorData[id].perSecond *= 1.25;
                }
            });
            renderGenerators();
        }
    },
    {
        name: 'Unlock Level',
        effect: 'advances your progression level',
        apply: () => { gameState.level += 1; updateStats(); }
    }
];

// Initialize Game
async function initializeGame() {
    loadGame();
    
    if (gameState.upgrades.length === 0) {
        await generateUpgrades(CONFIG.INITIAL_UPGRADES);
    }
    
    setupEventListeners();
    updateDisplay();
    startGameLoop();
}

// Generate Random Upgrades
async function generateUpgrades(count) {
    showLoadingIndicator(true);
    const newUpgrades = [];
    
    for (let i = 0; i < count; i++) {
        const upgradeId = `upgrade_${Date.now()}_${Math.random()}`;
        const effectTemplate = upgradeEffects[Math.floor(Math.random() * upgradeEffects.length)];
        const cost = Math.floor(CONFIG.BASE_UPGRADE_COST * Math.pow(CONFIG.COST_MULTIPLIER, gameState.upgrades.length + i));
        
        // Generate AI name and description
        const aiName = await generateUpgradeName(gameState.upgrades.length + i + 1);
        const aiDescription = await generateUpgradeDescription(aiName, effectTemplate.effect);
        
        const upgrade = {
            id: upgradeId,
            name: aiName,
            description: aiDescription,
            cost: cost,
            effect: effectTemplate.effect,
            purchased: false,
            applyEffect: effectTemplate.apply
        };
        
        newUpgrades.push(upgrade);
    }
    
    gameState.upgrades.push(...newUpgrades);
    renderUpgrades();
    showLoadingIndicator(false);
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('click-button').addEventListener('click', handleClick);
    document.getElementById('generate-upgrades-btn').addEventListener('click', generateMoreUpgrades);
    document.getElementById('save-btn').addEventListener('click', saveGame);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
}

// Handle Click
function handleClick() {
    gameState.resources += gameState.clickPower;
    gameState.totalClicks += 1;
    updateDisplay();
    
    // Floating animation
    const button = document.getElementById('click-button');
    button.style.transform = 'scale(0.95)';
    setTimeout(() => { button.style.transform = 'scale(1)'; }, 100);
}

// Generate More Upgrades
async function generateMoreUpgrades() {
    await generateUpgrades(CONFIG.UPGRADES_TO_GENERATE);
}

// Render Upgrades
function renderUpgrades() {
    const container = document.getElementById('upgrades-container');
    container.innerHTML = '';
    
    gameState.upgrades.forEach(upgrade => {
        if (upgrade.purchased) return; // Only show unpurchased
        
        const card = document.createElement('div');
        card.className = 'upgrade-card' + (gameState.resources < upgrade.cost ? ' unavailable' : '');
        card.innerHTML = `
            <div class="upgrade-name">${upgrade.name}</div>
            <div class="upgrade-description">${upgrade.description}</div>
            <div class="upgrade-effect">Effect: ${upgrade.effect}</div>
            <div class="upgrade-cost">Cost: ${formatNumber(upgrade.cost)}</div>
            <button class="upgrade-button" ${gameState.resources < upgrade.cost ? 'disabled' : ''}>
                Purchase
            </button>
        `;
        
        const button = card.querySelector('.upgrade-button');
        button.addEventListener('click', () => purchaseUpgrade(upgrade));
        
        container.appendChild(card);
    });
    
    if (gameState.upgrades.filter(u => !u.purchased).length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No unpurchased upgrades available. Generate more!</p>';
    }
}

// Purchase Upgrade
function purchaseUpgrade(upgrade) {
    if (gameState.resources >= upgrade.cost) {
        gameState.resources -= upgrade.cost;
        upgrade.purchased = true;
        gameState.upgradesPurchased += 1;
        upgrade.applyEffect();
        renderUpgrades();
        updateDisplay();
        
        // Generate new upgrade to maintain list
        generateUpgrades(1);
    }
}

// Render Generators
function renderGenerators() {
    const container = document.getElementById('generators-container');
    container.innerHTML = '';
    
    if (gameState.generators.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No generators yet. Purchase upgrades to unlock generators!</p>';
        return;
    }
    
    gameState.generators.forEach(id => {
        const gen = gameState.generatorData[id];
        if (!gen) return;
        
        const card = document.createElement('div');
        card.className = 'generator-card';
        card.innerHTML = `
            <div class="generator-name">${gen.name}</div>
            <div class="generator-info">
                <p><strong>Generates:</strong> ${formatNumber(gen.perSecond)}/sec</p>
                <p><strong>Total Generated:</strong> ${formatNumber(gen.totalGenerated || 0)}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// Game Loop
function startGameLoop() {
    setInterval(() => {
        // Passive generation
        const totalPerSecond = gameState.perSecond + 
            gameState.generators.reduce((sum, id) => {
                const gen = gameState.generatorData[id];
                return sum + (gen ? gen.perSecond : 0);
            }, 0);
        
        const generationPerTick = totalPerSecond / 10; // Update 10 times per second
        gameState.resources += generationPerTick;
        gameState.totalGenerated += generationPerTick;
        
        // Track generator totals
        gameState.generators.forEach(id => {
            if (gameState.generatorData[id]) {
                gameState.generatorData[id].totalGenerated = 
                    (gameState.generatorData[id].totalGenerated || 0) + (gameState.generatorData[id].perSecond / 10);
            }
        });
        
        updateDisplay();
    }, 100);
}

// Update Display
function updateDisplay() {
    document.getElementById('resource-count').textContent = formatNumber(gameState.resources);
    const totalPerSecond = gameState.perSecond + 
        gameState.generators.reduce((sum, id) => {
            const gen = gameState.generatorData[id];
            return sum + (gen ? gen.perSecond : 0);
        }, 0);
    document.getElementById('per-second').textContent = formatNumber(totalPerSecond);
    document.getElementById('level').textContent = gameState.level;
    updateStats();
    renderUpgrades();
}

function updateClickInfo() {
    document.getElementById('click-info').textContent = `+${formatNumber(gameState.clickPower)} per click`;
}

function updateStats() {
    document.getElementById('total-clicks').textContent = gameState.totalClicks;
    document.getElementById('total-generated').textContent = formatNumber(gameState.totalGenerated);
    document.getElementById('upgrades-purchased').textContent = gameState.upgradesPurchased;
    document.getElementById('play-time').textContent = formatTime(Date.now() - gameState.startTime);
}

// Utility Functions
function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toLocaleString();
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

function showLoadingIndicator(show) {
    const indicator = document.getElementById('loading-indicator');
    if (show) {
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

// Save/Load/Reset
function saveGame() {
    localStorage.setItem('infiniteUpgradesGameState', JSON.stringify(gameState));
    alert('Game saved!');
}

function loadGame() {
    const saved = localStorage.getItem('infiniteUpgradesGameState');
    if (saved) {
        Object.assign(gameState, JSON.parse(saved));
    }
}

function resetGame() {
    if (confirm('Are you sure you want to reset the game? This cannot be undone!')) {
        localStorage.removeItem('infiniteUpgradesGameState');
        location.reload();
    }
}

// Start the game
initializeGame();

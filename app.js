// --- 1. БАЗА ДАННЫХ МАТЕРИАЛОВ ---
const MATERIALS = {
    'O': { id: 'O', name: 'Воздух', color: '#1a1a1a', cooling: 0, mod: 0 },
    'X': { id: 'X', name: 'Ториевый топливный стержень', color: '#f1c40f', cooling: 0, mod: 0 },
    'C': { id: 'C', name: 'Гелидный криотеум', color: '#3498db', cooling: 3.0, mod: 0.5 },
    'E': { id: 'E', name: 'Жидкий эндер', color: '#2ecc71', cooling: 2.0, mod: 1.0 },
    'D': { id: 'D', name: 'Алмазный блок', color: '#00cec9', cooling: 0.5, mod: 3.0 },
    'G': { id: 'G', name: 'Графитовый блок', color: '#555555', cooling: 0.2, mod: 2.0 },
    'R': { id: 'R', name: 'Редстоун', color: '#e74c3c', cooling: 1.5, mod: 0.2 },
    'L': { id: 'L', name: 'Золотой блок', color: '#f39c12', cooling: 0.8, mod: 1.5 }
};

// --- 2. СОСТОЯНИЕ ПРИЛОЖЕНИЯ ---
let state = {
    dimX: 5,
    dimZ: 5,
    dimY: 5,
    insertion: 0,
    activeCooling: false,
    selectedMaterial: 'X',
    grid: [], // 2D массив клеток
    isDrawing: false
};

// --- 3. ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА ---
document.addEventListener('DOMContentLoaded', () => {
    initPalette();
    bindEvents();
    buildGrid();
});

function initPalette() {
    const palette = document.getElementById('palette');
    for (const key in MATERIALS) {
        const mat = MATERIALS[key];
        const btn = document.createElement('button');
        btn.className = `mat-btn ${key === state.selectedMaterial ? 'active' : ''}`;
        btn.innerHTML = `<div class="color-box" style="background-color: ${mat.color}"></div> ${mat.name}`;
        btn.onclick = () => {
            document.querySelectorAll('.mat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedMaterial = key;
        };
        palette.appendChild(btn);
    }
}

function bindEvents() {
    document.getElementById('dim-x').addEventListener('change', (e) => updateDim('dimX', e.target.value));
    document.getElementById('dim-z').addEventListener('change', (e) => updateDim('dimZ', e.target.value));
    document.getElementById('dim-y').addEventListener('change', (e) => {
        let val = Math.min(48, Math.max(1, parseInt(e.target.value) || 1));
        e.target.value = val;
        state.dimY = val;
        simulate();
    });

    const insSlider = document.getElementById('insertion');
    insSlider.addEventListener('input', (e) => {
        state.insertion = parseInt(e.target.value);
        document.getElementById('insertion-val').innerText = `${state.insertion}%`;
        simulate();
    });

    document.getElementById('active-cooling').addEventListener('change', (e) => {
        state.activeCooling = e.target.checked;
        document.getElementById('res-unit').innerText = state.activeCooling ? 'mB/t (Пар)' : 'RF/t';
        simulate();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        for(let x=0; x<state.dimX; x++) {
            for(let z=0; z<state.dimZ; z++) {
                state.grid[x][z] = 'O';
            }
        }
        drawGrid();
        simulate();
    });

    // Рисование по сетке
    const gridContainer = document.getElementById('grid-container');
    gridContainer.addEventListener('mousedown', () => state.isDrawing = true);
    document.addEventListener('mouseup', () => {
        if (state.isDrawing) {
            state.isDrawing = false;
            simulate(); // Считаем только когда отпустили мышку (оптимизация)
        }
    });
}

function updateDim(axis, value) {
    let val = Math.min(32, Math.max(1, parseInt(value) || 1));
    document.getElementById(axis === 'dimX' ? 'dim-x' : 'dim-z').value = val;
    state[axis] = val;
    buildGrid();
}

// --- 4. РАБОТА С СЕТКОЙ ---
function buildGrid() {
    // Сохраняем старую сетку, чтобы не стереть рисунок при расширении
    let newGrid = [];
    for (let x = 0; x < state.dimX; x++) {
        newGrid[x] = [];
        for (let z = 0; z < state.dimZ; z++) {
            newGrid[x][z] = (state.grid[x] && state.grid[x][z]) ? state.grid[x][z] : 'O';
        }
    }
    state.grid = newGrid;
    drawGrid();
    simulate();
}

function drawGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    // CSS Grid макет
    container.style.gridTemplateColumns = `repeat(${state.dimX}, 30px)`;
    container.style.gridTemplateRows = `repeat(${state.dimZ}, 30px)`;

    for (let z = 0; z < state.dimZ; z++) {
        for (let x = 0; x < state.dimX; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.backgroundColor = MATERIALS[state.grid[x][z]].color;
            
            const paint = () => {
                if(state.grid[x][z] !== state.selectedMaterial) {
                    state.grid[x][z] = state.selectedMaterial;
                    cell.style.backgroundColor = MATERIALS[state.selectedMaterial].color;
                }
            };

            cell.addEventListener('mousedown', paint);
            cell.addEventListener('mouseenter', () => { if(state.isDrawing) paint(); });
            
            container.appendChild(cell);
        }
    }
}

// --- 5. ФИЗИЧЕСКИЙ ДВИЖОК СИМУЛЯТОР (Локальный просчет) ---
function simulate() {
    let rodsCount = 0;
    let coolingScore = 0;
    let modScore = 0;

    // Считаем блоки (упрощенная модель передачи тепла и модерации)
    for (let x = 0; x < state.dimX; x++) {
        for (let z = 0; z < state.dimZ; z++) {
            const matId = state.grid[x][z];
            const mat = MATERIALS[matId];
            
            if (matId === 'X') rodsCount++;
            else {
                coolingScore += mat.cooling;
                modScore += mat.mod;
            }
        }
    }

    let totalRods = rodsCount * state.dimY;

    if (totalRods === 0) {
        updateResultsPanel({ output: 0, fuel: 0, fHeat: 20, cHeat: 20, fert: 0 });
        calculateCosts(0);
        return;
    }

    // Физика (Примерная аппроксимация механик мода)
    let activeRods = totalRods * (1 - (state.insertion / 100));
    if (activeRods <= 0) activeRods = 0.001; // Заглушка от деления на 0

    let baseHeat = activeRods * 60;
    let cFactor = 1 + (coolingScore * state.dimY) / activeRods;
    let mFactor = 1 + (modScore * state.dimY) / activeRods;

    let fuelHeat = Math.min(2000, 20 + (baseHeat / mFactor));
    let casingHeat = Math.min(2000, 20 + (fuelHeat / cFactor));

    let fertility = 100 + (activeRods * 2) + (modScore * 1.5);
    
    // Множители
    let rfPerHeat = 12.5; 
    let output = casingHeat * rfPerHeat * activeRods;
    let fuelUse = activeRods * (fuelHeat / 1000) * 0.05 * (150 / fertility);

    if (state.activeCooling) output /= 10; // Пар

    updateResultsPanel({ 
        output: output, 
        fuel: fuelUse, 
        fHeat: fuelHeat, 
        cHeat: casingHeat, 
        fert: fertility 
    });

    calculateCosts(rodsCount);
}

// --- 6. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА РЕЗУЛЬТАТОВ ---
function updateResultsPanel(data) {
    document.getElementById('res-output').innerText = Math.round(data.output).toLocaleString();
    document.getElementById('res-fuel').innerText = data.fuel.toFixed(4);
    document.getElementById('res-fuel-heat').innerText = Math.round(data.fHeat);
    document.getElementById('res-casing-heat').innerText = Math.round(data.cHeat);
    document.getElementById('res-fertility').innerText = Math.round(data.fert);
}

function calculateCosts(rodsCount) {
    let counts = {};
    for (let x = 0; x < state.dimX; x++) {
        for (let z = 0; z < state.dimZ; z++) {
            let mat = state.grid[x][z];
            if (mat !== 'O') {
                counts[mat] = (counts[mat] || 0) + state.dimY;
            }
        }
    }

    // Учет корпуса реактора
    let casingBlocks = ((state.dimX + 2) * (state.dimZ + 2) * 2) // Пол и потолок
                     + ((state.dimX + 2) * state.dimY * 2)       // Две стены
                     + (state.dimZ * state.dimY * 2)             // Две другие стены
                     - rodsCount // Минус отверстия сверху под стержни
                     - 1; // Минус контроллер

    const list = document.getElementById('res-costs');
    list.innerHTML = `<li><span>Корпус реактора (блоки):</span> <span>${casingBlocks.toLocaleString()}</span></li>`;
    list.innerHTML += `<li><span>Контроллер реактора:</span> <span>1</span></li>`;

    for (let key in counts) {
        list.innerHTML += `<li><span>${MATERIALS[key].name}:</span> <span>${counts[key].toLocaleString()}</span></li>`;
    }
}

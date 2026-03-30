const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const UI = {
    startBtn: document.getElementById('btn-start'),
    resetBtn: document.getElementById('btn-reset'),
    solveBtn: document.getElementById('btn-solve'),
    playAgainBtn: document.getElementById('btn-play-again'),
    scoreOverlay: document.getElementById('score-overlay'),
    statUserCost: document.getElementById('stat-user-cost'),
    statOptimalCost: document.getElementById('stat-optimal-cost'),
    statScore: document.getElementById('stat-score'),
    currentCost: document.getElementById('current-cost'),
    dijkstraExpl: document.getElementById('dijkstra-explanation')
};

const COLORS = {
    road: '#ffffff',
    sand: '#fef08a',
    mud: '#8b4513',
    wall: '#1e293b',
    start: '#4ade80',
    end: '#ef4444',
    player: '#3b82f6',
    optimalPath: 'rgba(168, 85, 247, 0.5)', 
    userPath: 'rgba(59, 130, 246, 0.5)',
    explored: 'rgba(168, 85, 247, 0.2)'
};

// Game Configuration
const ROWS = 20;
const COLS = 20;
const CELL_SIZE = 30; // 600px / 20

// Game State
let maze = null;
let player = {
    r: 0,
    c: 0,
    pixelX: 0,
    pixelY: 0,
    isMoving: false,
    targetR: 0,
    targetC: 0
};

let userCost = 0;
let userPath = []; // Stores cells the user visited
let isGameActive = false;
let animationId = null;
let pathfinderResult = null; 

// Smooth movement config
const MOVE_SPEED = 0.2; // pixels per frame multiplier roughly

function initGame() {
    isGameActive = true;
    userCost = 0;
    userPath = [];
    pathfinderResult = null;
    
    UI.scoreOverlay.classList.add('hidden');
    UI.currentCost.innerText = '0';

    maze = new Maze(COLS, ROWS);
    maze.generate();

    player.r = 0;
    player.c = 0;
    player.pixelX = 0;
    player.pixelY = 0;
    player.isMoving = false;
    player.targetR = 0;
    player.targetC = 0;

    userPath.push(maze.grid[0][0]); // Record start cell
    
    // Start game loop if not already running
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw cells background (terrain, start, end)
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let cell = maze.grid[r][c];
            let x = c * CELL_SIZE;
            let y = r * CELL_SIZE;

            // Fill terrain
            if (cell === maze.start) {
                ctx.fillStyle = COLORS.start;
            } else if (cell === maze.end) {
                ctx.fillStyle = COLORS.end;
            } else {
                ctx.fillStyle = COLORS[cell.terrain];
            }
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            
            // Draw explored overlay
            if (cell.explored && cell !== maze.start && cell !== maze.end) {
                ctx.fillStyle = COLORS.explored;
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    // 2. Draw Paths
    // Draw user path
    if (userPath.length > 1) {
        ctx.beginPath();
        let startX = userPath[0].col * CELL_SIZE + CELL_SIZE / 2;
        let startY = userPath[0].row * CELL_SIZE + CELL_SIZE / 2;
        ctx.moveTo(startX, startY);
        for (let i = 1; i < userPath.length; i++) {
            ctx.lineTo(userPath[i].col * CELL_SIZE + CELL_SIZE / 2, userPath[i].row * CELL_SIZE + CELL_SIZE / 2);
        }
        // if currently moving, draw line to player current interpolation visually
        if (isGameActive) {
            ctx.lineTo(player.pixelX + CELL_SIZE / 2, player.pixelY + CELL_SIZE / 2);
        }
        
        ctx.strokeStyle = COLORS.userPath;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    // Draw optimal path if finished
    if (pathfinderResult) {
        ctx.beginPath();
        let op = pathfinderResult.path;
        ctx.moveTo(op[0].col * CELL_SIZE + CELL_SIZE / 2, op[0].row * CELL_SIZE + CELL_SIZE / 2);
        for(let i=1; i<op.length; i++) {
            ctx.lineTo(op[i].col * CELL_SIZE + CELL_SIZE / 2, op[i].row * CELL_SIZE + CELL_SIZE / 2);
        }
        ctx.strokeStyle = COLORS.optimalPath;
        ctx.lineWidth = 6;
        ctx.stroke();
    }

    // 3. Draw Walls (do this after paths so walls overlay paths cleanly)
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = 2;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let cell = maze.grid[r][c];
            let x = c * CELL_SIZE;
            let y = r * CELL_SIZE;

            ctx.beginPath();
            if (cell.walls.top) {
                ctx.moveTo(x, y);
                ctx.lineTo(x + CELL_SIZE, y);
            }
            if (cell.walls.right) {
                ctx.moveTo(x + CELL_SIZE, y);
                ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
            }
            if (cell.walls.bottom) {
                ctx.moveTo(x, y + CELL_SIZE);
                ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
            }
            if (cell.walls.left) {
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + CELL_SIZE);
            }
            ctx.stroke();
        }
    }

    // 4. Draw Player
    let px = player.pixelX + CELL_SIZE / 2;
    let py = player.pixelY + CELL_SIZE / 2;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(px, py, CELL_SIZE * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Add a slight shadow/border
    ctx.strokeStyle = '#1d4ed8'; // Darker blue
    ctx.lineWidth = 2;
    ctx.stroke();
}

function update() {
    if (!player.isMoving) return;

    let targetPixelX = player.targetC * CELL_SIZE;
    let targetPixelY = player.targetR * CELL_SIZE;

    let dx = targetPixelX - player.pixelX;
    let dy = targetPixelY - player.pixelY;

    // Linear interpolation for smooth movement
    player.pixelX += dx * MOVE_SPEED;
    player.pixelY += dy * MOVE_SPEED;

    // Snap to grid when close enough
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
        player.pixelX = targetPixelX;
        player.pixelY = targetPixelY;
        player.r = player.targetR;
        player.c = player.targetC;
        player.isMoving = false;

        checkGameEnd();
    }
}

function checkGameEnd(isAutoSolve = false, optimalCostVal = 0) {
    let currentCell = maze.grid[player.r][player.c];
    if (currentCell === maze.end || isAutoSolve) {
        isGameActive = false;
        
        // Run Dijkstra if not auto-solved
        let pathfinder = isAutoSolve ? { path: [], optimalCost: optimalCostVal } : solveDijkstra(maze);
        if (!isAutoSolve) {
            pathfinderResult = { path: pathfinder.path, optimalCost: pathfinder.optimalCost };
        }
        
        let headerEl = UI.scoreOverlay.querySelector('h2');

        if (isAutoSolve) {
            headerEl.innerText = "Auto Solved!";
            UI.statUserCost.innerText = "-";
            UI.statOptimalCost.innerText = optimalCostVal;
            UI.statScore.innerText = "-";
            UI.dijkstraExpl.innerHTML = `Dijkstra's algorithm expanded across the grid (shown in light purple) to mathematically calculate and reveal the lowest cost path of <strong>${optimalCostVal}</strong>.`;
        } else {
            headerEl.innerText = "Level Complete!";
            
            // Calculate Score
            let rawScore = (pathfinder.optimalCost / userCost) * 100;
            let finalScoreValue = Math.min(100, Math.max(0, Math.round(rawScore)));

            // Update UI
            UI.statUserCost.innerText = userCost;
            UI.statOptimalCost.innerText = pathfinder.optimalCost;
            UI.statScore.innerText = finalScoreValue + '%';
            
            UI.dijkstraExpl.innerHTML = `Dijkstra's algorithm evaluated all possible routes to mathematically find the lowest cost path (<strong>${pathfinder.optimalCost}</strong>) shown in purple.<br><br>Your path (blue) cost <strong>${userCost}</strong>. Your score is calculated as <em>(${pathfinder.optimalCost} / ${userCost}) × 100</em>.`;
        }

        // Show overlay with fade-in effect
        setTimeout(() => {
            UI.scoreOverlay.classList.remove('hidden');
        }, 500); // Wait a bit so user can see they reached the end
    }
}

function gameLoop() {
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
}

// Input Handling
window.addEventListener('keydown', (e) => {
    if (!isGameActive || player.isMoving) return;

    let cell = maze.grid[player.r][player.c];
    let dr = 0;
    let dc = 0;

    switch (e.key) {
        case 'ArrowUp':
            if (!cell.walls.top && player.r > 0) dr = -1;
            break;
        case 'ArrowRight':
            if (!cell.walls.right && player.c < COLS - 1) dc = 1;
            break;
        case 'ArrowDown':
            if (!cell.walls.bottom && player.r < ROWS - 1) dr = 1;
            break;
        case 'ArrowLeft':
            if (!cell.walls.left && player.c > 0) dc = -1;
            break;
    }

    if (dr !== 0 || dc !== 0) {
        player.targetR = player.r + dr;
        player.targetC = player.c + dc;
        player.isMoving = true;

        let targetCell = maze.grid[player.targetR][player.targetC];
        userCost += targetCell.cost;
        UI.currentCost.innerText = userCost;
        
        // Don't add to tracking if tracing back exact same step to prevent cluttered lines
        if (userPath.length > 1 && userPath[userPath.length - 2] === targetCell) {
            userPath.pop(); // Visually undo trace... but cost is still added!
        } else {
            userPath.push(targetCell);
        }
    }
    
    // Prevent default scrolling
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
    }
});

// Button Events
UI.solveBtn.addEventListener('click', () => {
    if (!isGameActive || !maze) return;
    isGameActive = false; // Stop manual movement and game logic
    
    // reset current explored
    maze.grid.forEach(row => row.forEach(c => c.explored = false));
    userPath = []; // hide user path
    
    let { path, optimalCost, history } = solveDijkstra(maze);
    let historyIdx = 0;
    
    // Run an animation interval 
    let solveInterval = setInterval(() => {
        if (historyIdx < history.length) {
            // Animate exploration
            let hCell = history[historyIdx];
            hCell.explored = true;
            historyIdx++;
            
            // Fast forward logic to not take forever
            if (historyIdx < history.length) { history[historyIdx].explored = true; historyIdx++; }
            if (historyIdx < history.length) { history[historyIdx].explored = true; historyIdx++; }
        } else {
            clearInterval(solveInterval);
            pathfinderResult = { path, optimalCost };
            checkGameEnd(true, optimalCost);
        }
    }, 10);
});

UI.startBtn.addEventListener('click', () => {
    // Reset to start of current maze
    if (!maze) return;
    isGameActive = true;
    userCost = 0;
    userPath = [maze.grid[0][0]];
    pathfinderResult = null;
    maze.grid.forEach(row => row.forEach(c => c.explored = false));
    UI.scoreOverlay.classList.add('hidden');
    UI.currentCost.innerText = '0';
    
    player.r = 0;
    player.c = 0;
    player.pixelX = 0;
    player.pixelY = 0;
    player.isMoving = false;
    player.targetR = 0;
    player.targetC = 0;
});

UI.resetBtn.addEventListener('click', initGame);
UI.playAgainBtn.addEventListener('click', initGame);

// Start initially
initGame();
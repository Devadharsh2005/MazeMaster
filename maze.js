class Cell {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.visited = false;
        
        // true means there is a wall
        this.walls = {
            top: true,
            right: true,
            bottom: true,
            left: true
        };
        
        // Default terrain cost
        this.terrain = 'road';
        this.cost = 1;
    }
}

class Maze {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.grid = [];
        this.start = null;
        this.end = null;
        
        this.initGrid();
    }

    initGrid() {
        for (let r = 0; r < this.rows; r++) {
            let rowNodes = [];
            for (let c = 0; c < this.cols; c++) {
                rowNodes.push(new Cell(r, c));
            }
            this.grid.push(rowNodes);
        }
        this.start = this.grid[0][0];
        this.end = this.grid[this.rows - 1][this.cols - 1];
    }

    generate() {
        // Step 1: DFS perfect maze generation
        let stack = [];
        let current = this.start;
        current.visited = true;

        let unvisitedCount = this.rows * this.cols - 1;

        while (unvisitedCount > 0) {
            let next = this.getUnvisitedNeighbor(current);
            if (next) {
                next.visited = true;
                stack.push(current);
                this.removeWall(current, next);
                current = next;
                unvisitedCount--;
            } else if (stack.length > 0) {
                current = stack.pop();
            }
        }

        // Step 2: Create multiple paths (loops)
        this.createLoops(0.05); // remove 5% of remaining walls

        // Step 3: Assign Terrain types
        this.assignTerrain();
    }

    getUnvisitedNeighbor(cell) {
        let neighbors = [];
        let r = cell.row;
        let c = cell.col;

        if (r > 0 && !this.grid[r - 1][c].visited) neighbors.push(this.grid[r - 1][c]); // Top
        if (c < this.cols - 1 && !this.grid[r][c + 1].visited) neighbors.push(this.grid[r][c + 1]); // Right
        if (r < this.rows - 1 && !this.grid[r + 1][c].visited) neighbors.push(this.grid[r + 1][c]); // Bottom
        if (c > 0 && !this.grid[r][c - 1].visited) neighbors.push(this.grid[r][c - 1]); // Left

        if (neighbors.length > 0) {
            let r = Math.floor(Math.random() * neighbors.length);
            return neighbors[r];
        }
        return undefined;
    }

    removeWall(a, b) {
        let x = a.col - b.col;
        if (x === 1) {
            a.walls.left = false;
            b.walls.right = false;
        } else if (x === -1) {
            a.walls.right = false;
            b.walls.left = false;
        }

        let y = a.row - b.row;
        if (y === 1) {
            a.walls.top = false;
            b.walls.bottom = false;
        } else if (y === -1) {
            a.walls.bottom = false;
            b.walls.top = false;
        }
    }

    createLoops(density) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let cell = this.grid[r][c];
                
                // Randomly remove top wall if it's not the top border
                if (r > 0 && cell.walls.top && Math.random() < density) {
                    this.removeWall(cell, this.grid[r - 1][c]);
                }
                
                // Randomly remove left wall if it's not the left border
                if (c > 0 && cell.walls.left && Math.random() < density) {
                    this.removeWall(cell, this.grid[r][c - 1]);
                }
            }
        }
    }

    assignTerrain() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                // Keep start and end as default 'road'
                if ((r === 0 && c === 0) || (r === this.rows - 1 && c === this.cols - 1)) {
                    continue;
                }

                let rand = Math.random();
                if (rand < 0.6) {
                    this.grid[r][c].terrain = 'road';
                    this.grid[r][c].cost = 1;
                } else if (rand < 0.85) {
                    this.grid[r][c].terrain = 'sand';
                    this.grid[r][c].cost = 3;
                } else {
                    this.grid[r][c].terrain = 'mud';
                    this.grid[r][c].cost = 5;
                }
            }
        }
    }

    // Helper to get connected neighbors (where no wall exists)
    getConnectedNeighbors(cell) {
        let neighbors = [];
        let r = cell.row;
        let c = cell.col;

        if (!cell.walls.top && r > 0) neighbors.push(this.grid[r - 1][c]);
        if (!cell.walls.right && c < this.cols - 1) neighbors.push(this.grid[r][c + 1]);
        if (!cell.walls.bottom && r < this.rows - 1) neighbors.push(this.grid[r + 1][c]);
        if (!cell.walls.left && c > 0) neighbors.push(this.grid[r][c - 1]);

        return neighbors;
    }
}

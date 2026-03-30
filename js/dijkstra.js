class PriorityQueue {
    constructor() {
        this.values = [];
    }

    enqueue(val, priority) {
        this.values.push({ val, priority });
        this.sort();
    }

    dequeue() {
        return this.values.shift();
    }

    sort() {
        this.values.sort((a, b) => a.priority - b.priority);
    }
    
    isEmpty() {
        return this.values.length === 0;
    }
}

function solveDijkstra(maze) {
    let start = maze.start;
    let end = maze.end;
    
    // Map to keep track of distances
    let distances = new Map();
    // Map to keep track of previous cell for path reconstruction
    let previous = new Map();
    // Priority queue to get the cell with min distance
    let pq = new PriorityQueue();
    // Keep track of order for animation
    let history = [];

    // Initialize distances
    for (let r = 0; r < maze.rows; r++) {
        for (let c = 0; c < maze.cols; c++) {
            let cell = maze.grid[r][c];
            distances.set(cell, Infinity);
            previous.set(cell, null);
        }
    }

    distances.set(start, 0); // Entering the start cell doesn't cost anything initially if you're already there, but let's say the cost starts accumulating when moving to the NEXT cell.
    pq.enqueue(start, 0);

    while (!pq.isEmpty()) {
        let currentQueueItem = pq.dequeue();
        let currentCell = currentQueueItem.val;

        // Record for animation
        history.push(currentCell);

        // If we reached the end, we can stop
        if (currentCell === end) {
            break;
        }

        // Optimization: if the current priority is > distances.get(currentCell), skip
        if (currentQueueItem.priority > distances.get(currentCell)) {
            continue;
        }

        let neighbors = maze.getConnectedNeighbors(currentCell);

        for (let neighbor of neighbors) {
            // Calculate new distance: current distance + cost of entering the neighbor cell
            let candidateDistance = distances.get(currentCell) + neighbor.cost;
            
            if (candidateDistance < distances.get(neighbor)) {
                distances.set(neighbor, candidateDistance);
                previous.set(neighbor, currentCell);
                pq.enqueue(neighbor, candidateDistance);
            }
        }
    }

    // Reconstruct path
    let path = [];
    let curr = end;
    while (curr !== null) {
        path.unshift(curr);
        curr = previous.get(curr);
    }

    // Cost logic matches player: starting cell cost is 0 since you are already on it.
    // The total optimal cost is simply the distance at the end cell.
    let optimalCost = distances.get(end);

    return { path, optimalCost, history };
}
// state of game
let state = {};
let simulationMode = false;
let simulationImpact = {};
let numberOfPlayers = 1;

// main canvas element and its drawing context
const canvas = document.getElementById('game');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

// left info panel
const angle1DOM = document.querySelector("#info-left .angle");
const velocity1DOM = document.querySelector("#info-left .velocity");

// right info panel
const angle2DOM = document.querySelector("#info-right .angle");
const velocity2DOM = document.querySelector("#info-right .velocity");

// congratulations panel
const congratulationsDOM = document.getElementById("congratulations");
const winnerDOM = document.getElementById("winner");
const newGameButton = document.getElementById("new-game");

// the bomb's grab area
const bombGrabAreaDOM = document.getElementById("bomb-grab-area");

const blastHoleRadius = 18;

let isDragging = false;
let dragStartX = undefined;
let dragStartY = undefined;

newGame();

function newGame() {
    // reset game state
    state = {
        phase: "aiming", // aiming | in flight | celebrating
        currentPlayer: 1,
        round: 1,
        bomb: {
            x: undefined,
            y: undefined,
            rotation: 0,
            velocity: { 
                x: 0, 
                y: 0,
            },
        },

        // buildings
        backgroundBuildings: [],
        buildings: [],
        blastHoles: [],

        scale: 1,

    };

    // generate background buildings
    for (let i = 0; i < 11; i++) {
        generateBackgroundBuilding(i);
    }

    // generate buildings
    for (let i = 0; i < 8; i++) {
        generateBuilding(i);
    }

    calculateScale();

    initializeBombPosition();

    // reset HTML elements
    congratulationsDOM.style.visibility = "hidden";
    angle1DOM.innerText = 0;
    velocity1DOM.innerText = 0;
    angle2DOM.innerText = 0;
    velocity2DOM.innerText = 0;

    draw();

    if (numberOfPlayers === 0) computerThrow();
}

function announceWinner() {
    winnerDOM.innerText = `Player ${state.currentPlayer}`;
    congratulationsDOM.style.visibility = "visible";
}

function calculateScale() {
    const lastBuilding = state.buildings.at(-1);
    const totalWidthOfTheCity = lastBuilding.x + lastBuilding.width;

    state.scale = window.innerWidth / totalWidthOfTheCity;
}

function generateBackgroundBuilding(index) {
    const previousBuilding = state.backgroundBuildings[index - 1];

    const x = previousBuilding ? previousBuilding.x + previousBuilding.width + 4 : -30;

    const minWidth = 60;
    const maxWidth = 110;
    const width =  minWidth + Math.random() * (maxWidth - minWidth);

    const minHeight = 80;
    const maxHeight = 350;
    const height = minHeight + Math.random() * (maxHeight - minHeight);

    state.backgroundBuildings.push({
        x,
        width,
        height
    })
}

function generateBuilding(index) {
    const previousBuilding = state.buildings[index - 1];

    const x = previousBuilding ? previousBuilding.x + previousBuilding.width + 4 : 0;

    const minWidth = 80;
    const maxWidth = 130;
    const width = minWidth + Math.random() * (maxWidth - minWidth);

    const platformWithGorilla = index <= 1 || index >= 6;

    const minHeight = 40;
    const maxHeight = 300;
    const minHeightGorilla = 30;
    const maxHeightGorilla = 150;

    const height = platformWithGorilla ? minHeightGorilla + Math.random() * (maxHeightGorilla - minHeightGorilla) : minHeight + Math.random() * (maxHeight - minHeight);

    // generate array of booleans to show if window light is off or on
    const lightsOn = [];

    for (let i = 0; i < 50; i++) {
        const light = Math.random() <= 0.33 ? true : false;
        lightsOn.push(light);
    }

    state.buildings.push({
        x,
        width,
        height, 
        lightsOn
    })
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight / state.scale);
    gradient.addColorStop(1, "#F8BA85");
    gradient.addColorStop(0, "#FFC28E");

    // draw sky
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth / state.scale, window.innerHeight / state.scale);

    // draw moon
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(300, 350, 60, 0, 2 * Math.PI);
    ctx.fill();
}

function drawBackgroundBuildings() {
    state.backgroundBuildings.forEach((building) => {
        ctx.fillStyle = "#947285";
        ctx.fillRect(building.x, 0, building.width, building.height);
    })
}

function drawBuildings() {
    state.buildings.forEach((building) => {
        // draw building
        ctx.fillStyle = "#4A3C68";
        ctx.fillRect(building.x, 0, building.width, building.height);
    
        // draw windows
        const windowWidth = 10;
        const windowHeight = 12;
        const gap = 15;

        const numberOfFloors = Math.ceil((building.height - gap) / (windowHeight + gap));
        const numberOfRoomsPerFloor = Math.floor((building.width - gap) / (windowWidth + gap));

        for (let floor = 0; floor < numberOfFloors; floor++) {
            for (let room = 0; room < numberOfRoomsPerFloor; room++) {
                if (building.lightsOn[floor * numberOfRoomsPerFloor + room]) {
                    ctx.save();

                    ctx.translate(building.x + gap, building.height - gap);
                    ctx.scale(1, -1);

                    const x = room * (windowWidth + gap);
                    const y = floor * (windowHeight + gap);

                    ctx.fillStyle = "#EBB6A2";
                    ctx.fillRect(x, y, windowWidth, windowHeight);

                    ctx.restore();
                }
            }
        }

    });
}

function drawBuildingsWithBlastHoles() {
    ctx.save();

    state.blastHoles.forEach((blastHole) => {
        ctx.beginPath();

        // outer shape clockwise
        ctx.rect(
            0,
            0,
            window.innerWidth / state.scale,
            window.innerHeight / state.scale
        );

        // inner shape counterclockwise
        ctx.arc(blastHole.x, blastHole.y, blastHoleRadius, 0, 2 * Math.PI, true);





        ctx.clip();
    })

    drawBuildings();

    ctx.restore();
}

function drawGorilla(player) {
    ctx.save();

    const building = 
        player === 1 
            ? state.buildings.at(1) // second building
            : state.buildings.at(-2); // second last building
    ctx.translate(building.x + building.width / 2, building.height);

    drawGorillaBody();
    drawGorillaLeftArm(player);
    drawGorillaRightArm(player);
    drawGorillaFace(player);
    drawGorillaThoughtBubbles(player);

    ctx.restore();
}

function drawGorillaBody() {
    ctx.fillStyle = 'black';

    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-17, 18);
    ctx.lineTo(-20, 44);

    ctx.lineTo(-11, 77);
    ctx.lineTo(0, 84);
    ctx.lineTo(11, 77);

    ctx.lineTo(20, 44);
    ctx.lineTo(17, 18);
    ctx.lineTo(20, 0);
    ctx.lineTo(7, 0);
    ctx.fill();
}

function drawGorillaLeftArm(player) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 18;

    ctx.beginPath();
    ctx.moveTo(-14, 50);

    if (state.phase === "aiming" && state.currentPlayer === 1 && player === 1) {
        ctx.quadraticCurveTo(
            -44,
            63, 
            -28 - state.bomb.velocity.x / 6.25, 
            107 - state.bomb.velocity.y / 6.25
        );
    } else if (state.phase === "celebrating" && state.currentPlayer === player) {
        ctx.quadraticCurveTo(-44, 63, -28, 107);
    } else {
        ctx.quadraticCurveTo(-44, 45, -28, 12);
    }

    ctx.stroke();
}

function drawGorillaRightArm(player) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 18;

    ctx.beginPath();
    ctx.moveTo(14, 50);

    if (state.phase === "aiming" && state.currentPlayer === 2 && player === 2) {
        ctx.quadraticCurveTo(
            44, 
            63, 
            28 - state.bomb.velocity.x / 6.25, 
            107 - state.bomb.velocity.y / 6.25
        );
    } else if (state.phase === "celebrating" && state.currentPlayer === player) {
        ctx.quadraticCurveTo(44, 63, 28, 107);
    } else {
        ctx.quadraticCurveTo(44, 45, 28, 12);
    }

    ctx.stroke();
}

function drawGorillaFace(player) {
    // Face 
    ctx.fillStyle = "lightgray";
    ctx.beginPath();
    ctx.arc(0, 63, 9, 0, 2 * Math.PI);
    ctx.moveTo(-3.5, 70);
    ctx.arc(-3.5, 70, 4, 0, 2 * Math.PI);
    ctx.moveTo(3.5, 70);
    ctx.arc(3.5, 70, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(-3.5, 70, 1.4, 0, 2 * Math.PI);
    ctx.moveTo(3.5, 70);
    ctx.arc(3.5, 70, 1.4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1.4;

    // Nose
    ctx.beginPath();
    ctx.moveTo(-3.5, 66.5);
    ctx.lineTo(-1.5, 65);
    ctx.moveTo(3.5, 66.5);
    ctx.lineTo(1.5, 65);
    ctx.stroke();

    // Mouth
    ctx.beginPath();
    if (state.phase === "celebrating" && state.currentPlayer === player) {
        ctx.moveTo(-5, 60);
        ctx.quadraticCurveTo(0, 56, 5, 60);
    } else {
        ctx.moveTo(-5, 56);
        ctx.quadraticCurveTo(0, 60, 5, 56);
    }
    ctx.stroke();
    
}

function drawBomb() {
    ctx.save();
    ctx.translate(state.bomb.x, state.bomb.y);

    if (state.phase === "aiming") {
        // move the bomb with the mouse while aiming
        ctx.translate(-state.bomb.velocity.x / 6.25, -state.bomb.velocity.y / 6.25);
        
        // draw throwing trajectory
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.setLineDash([3, 8]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(state.bomb.velocity.x, state.bomb.velocity.y);
        ctx.stroke();
    
        // draw circle
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, 2 * Math.PI);
        ctx.fill();
    } else if (state.phase === "in flight") {
        // draw rotated banana
        ctx.fillStyle = "white";
        ctx.rotate(state.bomb.rotation);
        ctx.beginPath();
        ctx.moveTo(-8, -2);
        ctx.quadraticCurveTo(0, 12, 8, -2);
        ctx.quadraticCurveTo(0, 2, -8, -2);
        ctx.fill();
    } else {
        // draw circle
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, 2 * Math.PI);
        ctx.fill();
    }

    // restore transformation
    ctx.restore();
}

function draw() {
    ctx.save();

    // flip coordinate system upside down
    ctx.translate(0, window.innerHeight);
    ctx.scale(1, -1);
    ctx.scale(state.scale, state.scale);

    // draw scene
    drawBackground();
    drawBackgroundBuildings();
    drawBuildingsWithBlastHoles();
    drawGorilla(1);
    drawGorilla(2);
    drawBomb();

    // restore transformation
    ctx.restore();
}

function initializeBombPosition() {
    const building = 
        state.currentPlayer === 1 
            ? state.buildings.at(1) // second building
            : state.buildings.at(-2); // second last building
    
    const gorillaX = building.x + building.width / 2;
    const gorillaY = building.height;

    const gorillaHandOffsetX = state.currentPlayer === 1 ? -28 : 28;
    const gorillaHandOffsetY = 107;

    state.bomb.x = gorillaX + gorillaHandOffsetX;
    state.bomb.y = gorillaY + gorillaHandOffsetY;
    state.bomb.velocity.x = 0;
    state.bomb.velocity.y = 0;
    state.bomb.rotation = 0;

    // initialize the position of the grab area in HTML
    const grabAreaRadius = 15;
    const left = state.bomb.x * state.scale - grabAreaRadius;
    const bottom = state.bomb.y * state.scale - grabAreaRadius;
    bombGrabAreaDOM.style.left = `${left}px`;
    bombGrabAreaDOM.style.bottom = `${bottom}px`;
}

// set values on the info panel
function setInfo(deltaX, deltaY) {
    const hypotenuse = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    const angleInRadians = Math.asin(deltaY / hypotenuse);
    const angleInDegrees = (angleInRadians / Math.PI) * 180;

    if (state.currentPlayer === 1) {
        angle1DOM.innerText = Math.round(angleInDegrees);
        velocity1DOM.innerText = Math.round(hypotenuse);
    } else {
        angle2DOM.innerText = Math.round(angleInDegrees);
        velocity2DOM.innerText = Math.round(hypotenuse);
    }
}


// event handlers
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    calculateScale();
    initializeBombPosition();
    draw();
});

bombGrabAreaDOM.addEventListener("mousedown", function (e) {
    if (state.phase === "aiming") {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        document.body.style.cursor = "grabbing";
    }
});

window.addEventListener("mousemove", function (e) {
    if (isDragging) {
        let deltaX = e.clientX - dragStartX;
        let deltaY = e.clientY - dragStartY;

        state.bomb.velocity.x = -deltaX;
        state.bomb.velocity.y = deltaY;
        setInfo(deltaX, deltaY);

        draw();
    }
});

window.addEventListener("mouseup", function () {
    if (isDragging) {
        isDragging = false;
        document.body.style.cursor = "default";

        throwBomb();
    }
});

newGameButton.addEventListener("click", newGame);


function throwBomb() {
    if (simulationMode) {
        previousAnimationTimestamp = 0;
        animate(16);
    } else {
        state.phase = "in flight";
        previousAnimationTimestamp = undefined;
        requestAnimationFrame(animate);
    }
}
    

function animate(timestamp) {
    if (previousAnimationTimestamp === undefined) {
        previousAnimationTimestamp = timestamp;
        requestAnimationFrame(animate);
        return;
    }

    const elapsedTime = timestamp - previousAnimationTimestamp;

    const hitDetectionPrecision = 10;
    for (let i = 0; i < hitDetectionPrecision; i++) {
        moveBomb(elapsedTime / hitDetectionPrecision);

        // hit detection 
        const miss = checkFrameHit() || checkBuildingHit(); // bomb hit a building or went off-screen
        const hit = checkGorillaHit(); // bomb hit the enemy

        if (simulationMode && (hit || miss)) {
            simulationImpact = {
                x: state.bomb.x,
                y: state.bomb.y
            };
            return;
        }

        // handle the case when we hit a building or the bomb went off-screen
        if (miss) {
            state.currentPlayer = state.currentPlayer === 1 ? 2 : 1; // switch players
            if (state.currentPlayer === 1) state.round++;
            state.phase = "aiming";
            initializeBombPosition();

            draw();

            const computerThrowsNext = numberOfPlayers === 0 || (numberOfPlayers === 1 && state.currentPlayer === 2);

            if (computerThrowsNext) setTimeout(computerThrow, 50);

            return;
        }
        // handle the case when we hit the enemy
        if (hit) {
            state.phase = "celebrating";
            announceWinner();

            draw();
            return;
        }
    }

    

    if (!simulationMode) draw();

    // continue the animation loop
    previousAnimationTimestamp = timestamp;
    if (simulationMode) {
        animate(timestamp + 16);
    } else {
        requestAnimationFrame(animate);
    }
}

function moveBomb(elapsedTime) {
    const multiplier = elapsedTime / 200;
    
    // adjust trajectory by gravity
    state.bomb.velocity.y -= 20 * multiplier;

    // calculate new position
    state.bomb.x += state.bomb.velocity.x * multiplier;
    state.bomb.y += state.bomb.velocity.y * multiplier;

    // rotate according to the direction
    const direction = state.currentPlayer === 1 ? -1 : 1;
    state.bomb.rotation += direction * 5 * multiplier;
}

function checkFrameHit() {
    // stop throw animation once the bomb gets out of the left, 
    // bottom, or right edge of the screen
    if (
        state.bomb.y < 0 ||
        state.bomb.x < 0 ||
        state.bomb.x > window.innerWidth / state.scale
    ) {
        return true; // the bomb is off screen
    }
}

function checkBuildingHit() {
    for (let i = 0; i < state.buildings.length; i++) {
        const building = state.buildings[i];
        if (
            state.bomb.x + 4 > building.x &&
            state.bomb.x - 4 < building.x + building.width &&
            state.bomb.y - 4 < 0 + building.height
        ) {
            // check if the bomb is inside the blast hole of a previous impact
            for (let j = 0; j < state.blastHoles.length; j++) {
                const blastHole = state.blastHoles[j];

                // check how far the bomb is from the center of a previous blast hole
                const horizontalDistance = state.bomb.x - blastHole.x;
                const verticalDistance = state.bomb.y - blastHole.y;
                const distance = Math.sqrt(
                    horizontalDistance ** 2 + verticalDistance ** 2
                );
                if (distance < blastHoleRadius) {
                    // the bomb is inside of the rectangle of a building, but a previous bomb already blew off this part of the building
                    return false;
                }
            }
            
            if (!simulationMode) {
                state.blastHoles.push({
                    x: state.bomb.x,
                    y: state.bomb.y
                });
            }

            return true; //building hit
        }
    }
}

function checkGorillaHit() {
    const enemyPlayer = state.currentPlayer === 1 ? 2 : 1;
    const enemyBuilding = 
        enemyPlayer === 1 
            ? state.buildings.at(1) 
            : state.buildings.at(-2);
    
    ctx.save();

    ctx.translate(
        enemyBuilding.x + enemyBuilding.width / 2,
        enemyBuilding.height
    );

    drawGorillaBody();
    let hit = ctx.isPointInPath(state.bomb.x, state.bomb.y);

    drawGorillaLeftArm(enemyPlayer);
    hit ||= ctx.isPointInStroke(state.bomb.x, state.bomb.y);

    drawGorillaRightArm(enemyPlayer);
    hit ||= ctx.isPointInStroke(state.bomb.x, state.bomb.y);

    ctx.restore();

    return hit;
}

function runSimulations(numberOfSimulations) {
    let bestThrow = {
        velocityX: undefined,
        velocityY: undefined,
        distance: Infinity
    };

    simulationMode = true;

    // calculating the center position of the enemy 
    const  enemyBuilding = state.currentPlayer === 1 ? state.buildings.at(-2) : state.buildings.at(1);
    const enemyX = enemyBuilding.x + enemyBuilding.width / 2;
    const enemyY = enemyBuilding.height + 30;

    for (let i = 0; i < numberOfSimulations; i++) {
        // pick a random angle and velocity
        const angleInDegrees = 0 + Math.random() * 90;
        const angleInRadians = (angleInDegrees / 180) * Math.PI;
        const velocity = 40 + Math.random() * 100;

        // calculate the horizontal and vertical velocity
        const direction = state.currentPlayer === 1 ? 1 : -1;
        const velocityX = Math.cos(angleInRadians) * velocity * direction;
        const velocityY = Math.sin(angleInRadians) * velocity;

        initializeBombPosition();
        state.bomb.velocity.x = velocityX;
        state.bomb.velocity.y = velocityY;

        throwBomb();

        // calculating the distance between the simulated impact and the enemy
        const distance = Math.sqrt(
            (enemyX - simulationImpact.x) ** 2 + (enemyY - simulationImpact.y) ** 2
        );

        // if the current impact is closer to the enemy
        // than any of the previous simulations then pick this one
        if (distance < bestThrow.distance) {
            bestThrow = {
                velocityX,
                velocityY,
                distance
            };
        }
    }
    simulationMode = false;
    return bestThrow;
}

function computerThrow() {
    const numberOfSimulations = 2 + state.round * 3;
    const bestThrow = runSimulations(numberOfSimulations);

    initializeBombPosition();
    state.bomb.velocity.x = bestThrow.velocityX;
    state.bomb.velocity.y = bestThrow.velocityY;
    setInfo(bestThrow.velocityX, bestThrow.velocityY);

    // draw the aiming gorilla
    draw();

    // make it look like the computer is thinking for a second
    setTimeout(throwBomb, 1000);
}

function drawGorillaThoughtBubbles(player) {
    if (state.phase === "aiming") {
        const currentPlayerIsComputer = 
        (numberOfPlayers === 0 && state.currentPlayer === 1 && player === 1) || (numberOfPlayers !== 2 && state.currentPlayer === 2 && player === 2);

        if (currentPlayerIsComputer) {
            ctx.save();
            ctx.scale(1, -1);

            ctx.font = "20px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("?", 0, -90);

            ctx.font = "10px sans-serif";

            ctx.rotate((5 / 180) * Math.PI);
            ctx.fillText("?", 0, -90);

            ctx.rotate((-10 / 180) * Math.PI);
            ctx.fillText("?", 0, -90);            

            ctx.restore();
        }
    }
}
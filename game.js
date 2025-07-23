// Dog vs Hydrant - Retro Comic 2D Game
// Author: AI

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let WIDTH = canvas.width;
let HEIGHT = canvas.height;

// Responsive resize
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    canvas.style.width = WIDTH + 'px';
    canvas.style.height = HEIGHT + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game state
let state = 'instructions'; // 'instructions', 'countdown', 'playing', 'win', 'lose'
let countdown = 3;
let countdownTimer = 0;

// Dog
const dog = {
    x: 120, y: HEIGHT/2, w: 60, h: 40,
    vx: 0, vy: 0, speed: 7,
    color1: '#a0522d', // brown
    color2: '#fff',    // white
    cooldown: 0,
    alive: true
};
// Hydrant
const hydrant = {
    x: WIDTH-160, y: HEIGHT/2-50, w: 40, h: 90,
    color: '#e74c3c',
    health: 28, maxHealth: 28,
    cooldown: 0,
    shootPaused: false // New property for hydrant shooting pause
};
// Projectiles
let dogLasers = [];
let hydrantShots = [];

// Controls
const keys = {};
document.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if(state==='instructions') startCountdown(); });
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousedown', () => { if(state==='instructions') startCountdown(); });
canvas.addEventListener('touchstart', e => { if(state==='instructions') startCountdown(); });

// Detect mobile/small screen
function isMobile() {
    return window.innerWidth < 700 || window.innerHeight < 500;
}

// Scale factors for mobile
let scale = 1;
let dogScale = 1, hydrantScale = 1;
function updateScales() {
    if (isMobile()) {
        scale = 0.6;
        dogScale = 0.6;
        hydrantScale = 0.6;
    } else {
        scale = 1;
        dogScale = 1;
        hydrantScale = 1;
    }
}
window.addEventListener('resize', updateScales);
updateScales();

// Font utility for consistent style
function setGameFont(size, weight = 'bold') {
    ctx.font = `${weight} ${size}px Comic Sans MS, Comic Sans, Arial, sans-serif`;
}

// Touch controls
let touchMove = null, touchShoot = false, lastTouchCount = 0;
canvas.addEventListener('touchstart', e => {
    if (state === 'instructions') startCountdown();
    if (state !== 'playing') return;
    if (e.touches.length === 1) {
        touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && lastTouchCount < 2) {
        touchShoot = true; // Only on new two-finger tap
    }
    lastTouchCount = e.touches.length;
});
canvas.addEventListener('touchmove', e => {
    if (touchMove && e.touches.length === 1) {
        touchMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
});
canvas.addEventListener('touchend', e => {
    if (e.touches.length === 0) {
        touchMove = null;
        touchShoot = false;
    }
    lastTouchCount = e.touches.length;
});

function startCountdown() {
    state = 'countdown';
    countdown = 3;
    countdownTimer = Date.now();
    setTimeout(() => { countdown = 2; setTimeout(() => { countdown = 1; setTimeout(() => {
        countdown = 0; state = 'playing';
        hydrant.shootPaused = true;
        setTimeout(() => { hydrant.shootPaused = false; }, 1000); // 1s pause
    }, 1000); }, 1000); }, 1000);
}

function resetGame() {
    updateScales();
    dog.x = 120 * scale; dog.y = HEIGHT/2; dog.vx = 0; dog.vy = 0; dog.cooldown = 0; dog.alive = true;
    dog.w = 120 * dogScale; dog.h = 60 * dogScale;
    hydrant.x = WIDTH-160 * scale; hydrant.y = HEIGHT/2-50 * scale; hydrant.health = hydrant.maxHealth; hydrant.cooldown = 0;
    hydrant.w = 40 * hydrantScale; hydrant.h = 90 * hydrantScale;
    dogLasers = [];
    hydrantShots = [];
    state = 'instructions';
    hydrant.shootPaused = false;
}

function update() {
    if (state !== 'playing') return;
    // Move dog
    dog.vx = 0; dog.vy = 0;
    if (keys['arrowup'] || keys['w']) dog.vy = -dog.speed;
    if (keys['arrowdown'] || keys['s']) dog.vy = dog.speed;
    if (keys['arrowleft'] || keys['a']) dog.vx = -dog.speed;
    if (keys['arrowright'] || keys['d']) dog.vx = dog.speed;
    // Touch move
    if (touchMove) {
        let dx = touchMove.x - (dog.x + dog.w/2);
        let dy = touchMove.y - (dog.y + dog.h/2);
        let mag = Math.sqrt(dx*dx+dy*dy);
        if (mag > 10) {
            dog.vx = dog.speed * dx/mag;
            dog.vy = dog.speed * dy/mag;
        }
    }
    dog.x += dog.vx; dog.y += dog.vy;
    dog.x = Math.max(0, Math.min(WIDTH-dog.w, dog.x));
    dog.y = Math.max(0, Math.min(HEIGHT-dog.h, dog.y));
    // Shoot
    if ((((keys[' '] || keys['space']) && dog.cooldown<=0) || (touchShoot && dog.cooldown<=0))) {
        dogLasers.push({ x: dog.x + 120 * dogScale, y: dog.y+40 * dogScale, w: 22 * dogScale, h: 10 * dogScale, speed: 22 }); // Shoots from mouth
        dog.cooldown = 14;
        touchShoot = false; // Reset after single shot
    }
    if (dog.cooldown>0) dog.cooldown--;
    // Update dog lasers
    for (let i=dogLasers.length-1; i>=0; i--) {
        dogLasers[i].x += dogLasers[i].speed;
        if (rectsCollide(dogLasers[i], hydrant)) {
            hydrant.health--;
            dogLasers.splice(i,1);
            if (hydrant.health<=0) { state='win'; setTimeout(resetGame, 2000); }
            continue;
        }
        if (dogLasers[i].x > WIDTH) dogLasers.splice(i,1);
    }
    // Hydrant AI: add 1s pause after countdown
    if (hydrant.cooldown<=0 && !hydrant.shootPaused && state==='playing') {
        let dx = (dog.x+dog.w/2)-(hydrant.x+hydrant.w/2);
        let dy = (dog.y+dog.h/2)-(hydrant.y+hydrant.h/2);
        let mag = Math.sqrt(dx*dx+dy*dy);
        hydrantShots.push({
            x: hydrant.x,
            y: hydrant.y+hydrant.h/2-8*hydrantScale,
            w: 20*hydrantScale, h: 16*hydrantScale,
            vx: 16*dx/mag + Math.random()*2-1,
            vy: 16*dy/mag + Math.random()*2-1
        });
        hydrant.cooldown = Math.max(12, 36-Math.floor((hydrant.maxHealth-hydrant.health)/2));
    }
    if (hydrant.cooldown>0) hydrant.cooldown--;
    // Update hydrant shots
    for (let i=hydrantShots.length-1; i>=0; i--) {
        hydrantShots[i].x += hydrantShots[i].vx;
        hydrantShots[i].y += hydrantShots[i].vy;
        if (rectsCollide(hydrantShots[i], dog)) {
            dog.alive = false; state='lose'; setTimeout(resetGame, 2000); return;
        }
        if (hydrantShots[i].x<-30||hydrantShots[i].x>WIDTH+30||hydrantShots[i].y<-30||hydrantShots[i].y>HEIGHT+30) hydrantShots.splice(i,1);
    }
}

function rectsCollide(a,b) {
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function draw() {
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    // Comic background
    ctx.save();
    ctx.fillStyle = ctx.createLinearGradient(0,0,WIDTH,HEIGHT);
    ctx.fillStyle.addColorStop ? ctx.fillStyle.addColorStop(0,'#ffe082') : null;
    ctx.fillStyle.addColorStop ? ctx.fillStyle.addColorStop(1,'#ffb300') : null;
    ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.restore();
    // Instructions
    if (state==='instructions') { drawInstructions(); return; }
    // Countdown
    if (state==='countdown') { drawCountdown(); return; }
    // Hydrant
    drawHydrant(hydrant);
    // Dog
    if (dog.alive) drawDog(dog);
    // Projectiles
    for (const l of dogLasers) drawLaser(l);
    for (const s of hydrantShots) drawHydrantShot(s);
    // Health bar
    drawHealthBar();
    // Win/Lose
    if (state==='win') drawWin();
    if (state==='lose') drawLose();
}

function drawInstructions() {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#fffbe9';
    ctx.fillRect(WIDTH/2-260, HEIGHT/2-210, 520, 420);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 6;
    ctx.strokeRect(WIDTH/2-260, HEIGHT/2-210, 520, 420);
    setGameFont(44);
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'center';
    ctx.fillText('Dog vs Hydrant', WIDTH/2, HEIGHT/2-120);
    setGameFont(24);
    ctx.fillStyle = '#222';
    ctx.fillText('How to Play:', WIDTH/2, HEIGHT/2-70);
    setGameFont(20);
    ctx.fillText('Move: Arrow Keys or WASD', WIDTH/2, HEIGHT/2-30);
    ctx.fillText('Shoot: Spacebar', WIDTH/2, HEIGHT/2);
    ctx.fillText('On phone: Drag to move, two-finger tap to shoot', WIDTH/2, HEIGHT/2+30);
    setGameFont(18);
    ctx.fillStyle = '#555';
    ctx.fillText('Goal: Destroy the hydrant without getting hit!', WIDTH/2, HEIGHT/2+70);
    setGameFont(18);
    ctx.fillStyle = '#e67e22';
    ctx.fillText('Tip: Rotate your phone and play horizontally!', WIDTH/2, HEIGHT/2+100);
    setGameFont(22);
    ctx.fillStyle = '#009688';
    ctx.fillText('Tap, click, or press any key to start!', WIDTH/2, HEIGHT/2+140);
    ctx.restore();
}

function drawCountdown() {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#fffbe9';
    ctx.fillRect(WIDTH/2-120, HEIGHT/2-120, 240, 240);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 8;
    ctx.strokeRect(WIDTH/2-120, HEIGHT/2-120, 240, 240);
    setGameFont(120);
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'center';
    ctx.fillText(countdown, WIDTH/2, HEIGHT/2+50);
    ctx.restore();
}

function drawDog(d) {
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#222';
    // Body (elongated oval, brown)
    ctx.fillStyle = d.color1;
    ctx.beginPath();
    ctx.ellipse(d.x+38*dogScale, d.y+28*dogScale, 34*dogScale, 18*dogScale, 0.1, 0, 2*Math.PI); // body
    ctx.fill(); ctx.stroke();
    // Back legs (hind legs, comic paw)
    ctx.fillStyle = d.color2;
    ctx.beginPath();
    ctx.ellipse(d.x+20*dogScale, d.y+44*dogScale, 8*dogScale, 14*dogScale, 0.2, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(d.x+44*dogScale, d.y+46*dogScale, 8*dogScale, 14*dogScale, 0.1, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    // Front legs
    ctx.beginPath();
    ctx.ellipse(d.x+60*dogScale, d.y+44*dogScale, 7*dogScale, 13*dogScale, 0.1, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(d.x+74*dogScale, d.y+42*dogScale, 7*dogScale, 13*dogScale, 0.1, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    // Tail (brown, comic curve, more upright)
    ctx.strokeStyle = d.color1;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(d.x+8*dogScale, d.y+28*dogScale);
    ctx.quadraticCurveTo(d.x-10*dogScale, d.y+2*dogScale, d.x+18*dogScale, d.y-10*dogScale);
    ctx.stroke();
    // Head (white, round, with snout)
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#222';
    ctx.fillStyle = d.color2;
    ctx.beginPath();
    ctx.ellipse(d.x+88*dogScale, d.y+18*dogScale, 18*dogScale, 15*dogScale, -0.1, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    // Snout (white, oval, more pronounced)
    ctx.beginPath();
    ctx.ellipse(d.x+104*dogScale, d.y+22*dogScale, 12*dogScale, 8*dogScale, 0, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    // Nose (brown, larger)
    ctx.fillStyle = d.color1;
    ctx.beginPath();
    ctx.arc(d.x+114*dogScale, d.y+22*dogScale, 4*dogScale, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    // Ears (brown, one floppy, one upright, more realistic)
    ctx.fillStyle = d.color1;
    ctx.beginPath();
    ctx.ellipse(d.x+92*dogScale, d.y+2*dogScale, 6*dogScale, 16*dogScale, -0.7, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(d.x+80*dogScale, d.y+4*dogScale, 5*dogScale, 13*dogScale, 0.5, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    // Eyes (comic, closer to snout)
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(d.x+98*dogScale, d.y+16*dogScale, 3*dogScale, 0, 2*Math.PI);
    ctx.arc(d.x+106*dogScale, d.y+16*dogScale, 3*dogScale, 0, 2*Math.PI);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(d.x+104*dogScale, d.y+26*dogScale, 7*dogScale, 0.2, 0.9);
    ctx.stroke();
    ctx.restore();
}

function drawHydrant(h) {
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#222';
    // Main body (tall, cylindrical, red)
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.ellipse(h.x+20*hydrantScale, h.y+55*hydrantScale, 22*hydrantScale, 48*hydrantScale, 0, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    // Top dome (wider, more hydrant-like)
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(h.x+20*hydrantScale, h.y+12*hydrantScale, 22*hydrantScale, 12*hydrantScale, 0, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    // Cap (gray, more defined)
    ctx.fillStyle = '#aaa';
    ctx.fillRect(h.x+6*hydrantScale, h.y*hydrantScale, 28*hydrantScale, 12*hydrantScale);
    ctx.strokeRect(h.x+6*hydrantScale, h.y*hydrantScale, 28*hydrantScale, 12*hydrantScale);
    // Side bolts (bigger, more hydrant-like)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(h.x-8*hydrantScale, h.y+55*hydrantScale, 8*hydrantScale, 0, 2*Math.PI);
    ctx.arc(h.x+48*hydrantScale, h.y+55*hydrantScale, 8*hydrantScale, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    // Face (angry eyes, mouth)
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(h.x+14*hydrantScale, h.y+50*hydrantScale, 4*hydrantScale, 0, Math.PI);
    ctx.arc(h.x+26*hydrantScale, h.y+50*hydrantScale, 4*hydrantScale, 0, Math.PI);
    ctx.fill();
    // Mouth
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x+20*hydrantScale, h.y+68*hydrantScale, 9*hydrantScale, 0.2, 0.9);
    ctx.stroke();
    // Water spray effect when shooting
    if (h.cooldown > 20) {
        ctx.strokeStyle = '#00f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(h.x+20*hydrantScale, h.y+55*hydrantScale);
        ctx.lineTo(h.x-40*hydrantScale, h.y+55*hydrantScale+Math.random()*40*hydrantScale-20*hydrantScale);
        ctx.stroke();
    }
    ctx.restore();
}

function drawLaser(l) {
    ctx.save();
    ctx.fillStyle = '#0ff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(l.x+l.w/2, l.y+l.h/2, l.w/2, l.h/2, 0, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    ctx.restore();
}
function drawHydrantShot(s) {
    ctx.save();
    ctx.fillStyle = '#39f';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(s.x+s.w/2, s.y+s.h/2, s.w/2, s.h/2, 0, 0, 2*Math.PI);
    ctx.fill(); ctx.stroke();
    ctx.restore();
}
function drawHealthBar() {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(WIDTH-260, 30, 200, 22);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(WIDTH-260, 30, 200*(hydrant.health/hydrant.maxHealth), 22);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.strokeRect(WIDTH-260, 30, 200, 22);
    setGameFont(18);
    ctx.fillText('HYDRANT', WIDTH-250, 47);
    ctx.restore();
}
function drawWin() {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fffbe9';
    ctx.fillRect(WIDTH/2-200, HEIGHT/2-80, 400, 160);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 6;
    ctx.strokeRect(WIDTH/2-200, HEIGHT/2-80, 400, 160);
    setGameFont(54);
    ctx.fillStyle = '#009688';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WIN!', WIDTH/2, HEIGHT/2+20);
    ctx.restore();
}
function drawLose() {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fffbe9';
    ctx.fillRect(WIDTH/2-200, HEIGHT/2-80, 400, 160);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 6;
    ctx.strokeRect(WIDTH/2-200, HEIGHT/2-80, 400, 160);
    setGameFont(54);
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', WIDTH/2, HEIGHT/2+20);
    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop(); 
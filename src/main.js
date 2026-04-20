import * as PIXI from "pixi.js";

const app = new PIXI.Application();
await app.init({
	width: 1900,
	height: 920,
	background: 0x0a0a1a,
});
document.body.appendChild(app.canvas);

// ── Player ────────────────────────────────────────────────
const playerGfx = new PIXI.Graphics();
playerGfx.circle(0, 0, 25).fill(0x00ccff);
playerGfx.x = app.screen.width / 2;
playerGfx.y = app.screen.height - 200;
app.stage.addChild(playerGfx);

// ── UI Text ───────────────────────────────────────────────
let score = 0;
let lives = 3;

const scoreText = new PIXI.Text({
	text: "Score: 0",
	style: {
		fontFamily: "Arial",
		fontSize: 28,
		fill: 0xffffff,
		fontWeight: "bold",
	},
});
const livesText = new PIXI.Text({
	text: "Lives: 3",
	style: {
		fontFamily: "Arial",
		fontSize: 28,
		fill: 0xffffff,
		fontWeight: "bold",
	},
});
const gameOverText = new PIXI.Text({
	text: "Game Over!",
	style: {
		fontFamily: "Arial",
		fontSize: 60,
		fill: 0xff4444,
		fontWeight: "bold",
	},
});

scoreText.x = 20;
scoreText.y = 20;
livesText.x = 20;
livesText.y = 60;
gameOverText.x = app.screen.width / 2 - gameOverText.width / 2;
gameOverText.y = app.screen.height / 2 - gameOverText.height / 2;
gameOverText.visible = false;

app.stage.addChild(scoreText);
app.stage.addChild(livesText);
app.stage.addChild(gameOverText);

// ── Enemies ───────────────────────────────────────────────
const enemies = []; // array of { gfx, hp, vx, wobble }
const ENEMY_RADIUS = 20;
const ENEMY_BASE_SPEED = 1.5;
const STEP_DOWN = 60; // how many px down each time they bounce a wall
let enemySpeed = ENEMY_BASE_SPEED;

function createEnemy() {
	const gfx = new PIXI.Graphics();
	gfx.circle(0, 0, ENEMY_RADIUS).fill(0xff0000);

	gfx.x = -ENEMY_RADIUS; // start just off screen
	gfx.y = 80;

	app.stage.addChild(gfx);

	enemies.push({
		gfx,
		hp: 3,
		vx: enemySpeed, // start moving right
		wobble: Math.random() * Math.PI * 2, // random phase offset — key for async wobble
	});
}

// Spawn enemies one by one with a delay
for (let i = 0; i < 100; i++) {
	setTimeout(() => createEnemy(), i * 300);
}

// ── Bullets ───────────────────────────────────────────────
const bullets = [];
let fireCooldown = 0;

// ── Mouse ─────────────────────────────────────────────────
let mouseX = playerGfx.x;
let mouseY = playerGfx.y;
let shooting = false;

window.addEventListener("mousemove", (e) => {
	mouseX = e.clientX;
	mouseY = e.clientY;
});
window.addEventListener("mousedown", (e) => {
	if (e.button === 0) shooting = true;
});
window.addEventListener("mouseup", (e) => {
	if (e.button === 0) shooting = false;
});
window.addEventListener("contextmenu", (e) => e.preventDefault());

// ── Game loop ─────────────────────────────────────────────
let gameRunning = true;

app.ticker.add((ticker) => {
	if (fireCooldown > 0) fireCooldown--;

	// Player follows mouse with lerp + boundary clamp
	const cx = Math.max(25, Math.min(app.screen.width - 25, mouseX));
	const cy = Math.max(620, Math.min(app.screen.height - 25, mouseY));
	playerGfx.x += (cx - playerGfx.x) * 0.5;
	playerGfx.y += (cy - playerGfx.y) * 0.5;

	// Shoot
	if (shooting && fireCooldown <= 0) {
		const b = new PIXI.Graphics();
		b.rect(-3, -10, 6, 20).fill(0xffff00);
		b.x = playerGfx.x;
		b.y = playerGfx.y;
		app.stage.addChild(b);
		bullets.push(b);
		fireCooldown = 10;
	}

	// ── Update enemies ────────────────────────────────────
	for (let i = enemies.length - 1; i >= 0; i--) {
		const e = enemies[i];
		const g = e.gfx;

		// Horizontal movement
		g.x += e.vx * ticker.deltaTime;

		// Drunk wobble — each enemy has a different wobble offset
		// so they oscillate independently
		e.wobble += 0.05;
		g.y += Math.sin(e.wobble) * 0.3;

		// Bounce off right wall → step down, reverse direction
		if (g.x > app.screen.width - ENEMY_RADIUS) {
			g.x = app.screen.width - ENEMY_RADIUS; // clamp so it doesn't escape
			e.vx = -Math.abs(e.vx); // force left
			g.y += STEP_DOWN;
		}

		// Bounce off left wall → step down, reverse direction
		if (g.x < ENEMY_RADIUS) {
			g.x = ENEMY_RADIUS; // clamp
			e.vx = Math.abs(e.vx); // force right
			g.y += STEP_DOWN;
		}

		// Enemy reached the bottom → lose a life, remove it
		if (g.y > app.screen.height) {
			app.stage.removeChild(g);
			g.destroy();
			enemies.splice(i, 1);

			lives--;
			livesText.text = "Lives: " + lives;

			if (lives <= 0) {
				gameOverText.visible = true;
				gameRunning = false;
				app.ticker.stop();
				return;
			}
			continue;
		}
	}

	// ── Update bullets ────────────────────────────────────
	for (let i = bullets.length - 1; i >= 0; i--) {
		const b = bullets[i];
		b.y -= 20 * ticker.deltaTime;

		// Off screen
		if (b.y < 0) {
			app.stage.removeChild(b);
			b.destroy();
			bullets.splice(i, 1);
			continue;
		}

		// Check against every enemy
		let bulletConsumed = false;
		for (let j = enemies.length - 1; j >= 0; j--) {
			const e = enemies[j];
			const dx = b.x - e.gfx.x;
			const dy = b.y - e.gfx.y;

			if (Math.sqrt(dx * dx + dy * dy) < ENEMY_RADIUS + 5) {
				// Hit!
				e.hp--;

				if (e.hp <= 0) {
					// Enemy dead
					app.stage.removeChild(e.gfx);
					e.gfx.destroy();
					enemies.splice(j, 1);

					score += 10;
					scoreText.text = "Score: " + score;
					enemySpeed += 0.05; // tiny speed bump per kill
				} else {
					// Flash white
					e.gfx.tint = 0xffffff;
					setTimeout(() => {
						if (!e.gfx.destroyed) e.gfx.tint = 0xff0000;
					}, 80);
				}

				bulletConsumed = true;
				break; // one bullet hits one enemy — stop checking
			}
		}

		if (bulletConsumed) {
			app.stage.removeChild(b);
			b.destroy();
			bullets.splice(i, 1);
		}
	}
});
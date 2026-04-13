import * as PIXI from "pixi.js";

// Create the app
const app = new PIXI.Application();

// Initialize it (async — we need to await it)
await app.init({
	width: 1900,
	height: 920,
	background: 0x0a0a1a, // dark navy — our space background
});

// Stick the canvas into the webpage
document.body.appendChild(app.canvas);

// Draw a white circle (our "player" for now)
const player = new PIXI.Graphics();
player.circle(0, 0, 25).fill(0x00ccff);

let enemy = new PIXI.Graphics();
enemy.circle(0, 0, 20).fill(0xff0000);

player.x = app.screen.width / 2;
player.y = app.screen.height - 200;

enemy.x = app.screen.width / 2;
enemy.y = 100;

// Add it to the stage so it gets rendered
app.stage.addChild(player);
app.stage.addChild(enemy);

// Track which keys are currently held down
const keys = {};

window.addEventListener("keydown", (e) => {
	keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
	keys[e.code] = false;
});

const bullets = []; // array to track all active bullets
let fireCooldown = 0; // frames untill we can fire again

// Shoot when spacebar is pressed
window.addEventListener("keydown", (e) => {
	if (e.code === "Space" && fireCooldown <= 0) {
		// Create a bullet
		const bullet = new PIXI.Graphics();
		bullet.rect(-3, -10, 6, 20).fill(0xffff00); // thin yellow rectangle

		// Start at the player's position
		bullet.x = player.x;
		bullet.y = player.y;

		app.stage.addChild(bullet);
		bullets.push(bullet); // track it

		fireCooldown = 10; // add a cooldown to prevent spamming
	}
});

let enemyHP = 3;
const enemyStartX = app.screen.width / 2;

function spawnEnemy() {
	enemy.destroyed; // if old one gone, we need a fresh one —
	// actually, let's reset instead of recreating for now:
	enemy.x = Math.random() * (app.screen.width - 100) + 50;
	enemy.y = 100;
	enemy.tint = 0xff0000;
	enemyHP = 3;
}

app.ticker.add((ticker) => {
	const playerSpeed = 10;
	const enemySpeed = 2;
	const dx = playerSpeed * ticker.deltaTime;

	if (fireCooldown > 0) fireCooldown--;

	// Only move enemy if it's alive
	if (!enemy.destroyed) {
		enemy.y += enemySpeed * ticker.deltaTime;
		enemy.x = enemyStartX + Math.sin(ticker.lastTime / 500) * 100;

		// Enemy reached bottom — respawn
		if (enemy.y > app.screen.height) {
			spawnEnemy();
		}
	}

	enemy.y += enemySpeed * ticker.deltaTime; // Move enemy downwards
	enemy.x = enemyStartX + Math.sin(ticker.lastTime / 500) * 100; // add some horizontal movement

	if (keys["ArrowLeft"]) player.x = Math.max(25, player.x - dx);
	if (keys["ArrowRight"])
		player.x = Math.min(app.screen.width - 25, player.x + dx);
	if (keys["ArrowUp"]) player.y = Math.max(25, player.y - dx);
	if (keys["ArrowDown"])
		player.y = Math.min(app.screen.height - 25, player.y + dx);

	// bullets
	for (let i = bullets.length - 1; i >= 0; i--) {
		const b = bullets[i];
		b.y -= 20 * ticker.deltaTime;

		// Off screen — remove
		if (b.y < 0) {
			app.stage.removeChild(b);
			b.destroy();
			bullets.splice(i, 1);
			continue; // skip collision check for this bullet
		}

		// Collision — only check if enemy is alive
		if (!enemy.destroyed) {
			const distx = b.x - enemy.x;
			const disty = b.y - enemy.y;
			const distance = Math.sqrt(distx * distx + disty * disty);

			if (distance < 25) {
				// Remove bullet
				app.stage.removeChild(b);
				b.destroy();
				bullets.splice(i, 1);

				// Reduce HP
				enemyHP--;
				console.log("Hit! HP remaining:", enemyHP);

				if (enemyHP <= 0) {
					// Enemy dead
					console.log("Enemy destroyed!");
					app.stage.removeChild(enemy);
					enemy.destroy();
					// Spawn new one after 1 second
					setTimeout(() => {
						const newEnemy = new PIXI.Graphics();
						newEnemy.circle(0, 0, 20).fill(0xff0000);
						newEnemy.x =
							Math.random() * (app.screen.width - 100) + 50;
						newEnemy.y = 100;
						app.stage.addChild(newEnemy);
						// reassign the enemy variable
						enemy = newEnemy;
						enemyHP = 3;
					}, 1000);
				} else {
					// Flash white on hit
					enemy.tint = 0xffffff;
					setTimeout(() => {
						if (!enemy.destroyed) enemy.tint = 0xff0000;
					}, 100);
				}
				continue;
			}
		}
	}
});

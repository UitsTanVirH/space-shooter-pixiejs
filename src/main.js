import * as PIXI from "pixi.js";

const app = new PIXI.Application();

await app.init({
	width: 1900,
	height: 920,
	background: 0x0a0a1a, // dark navy
});

// stick the canvas into the webpage
document.body.appendChild(app.canvas);

// player and enemy graphics
let player = new PIXI.Graphics();
player.circle(0, 0, 25).fill(0x00ccff);

let enemy = new PIXI.Graphics();
enemy.circle(0, 0, 20).fill(0xff0000);

player.x = app.screen.width / 2;
player.y = app.screen.height - 200;

enemy.x = app.screen.width / 2;
enemy.y = 100;

// score tracking
app.stage.addChild(player);
app.stage.addChild(enemy);

let score = 0;

const scoreText = new PIXI.Text({
	text: "Score: 0",
	style: {
		fontFamily: "Arial",
		fontSize: 28,
		fill: 0xffffff,
		fontWeight: "bold",
	},
});

scoreText.x = 20;
scoreText.y = 20;
app.stage.addChild(scoreText);

const livesText = new PIXI.Text({
	text: "Lives: 100",
	style: {
		fontFamily: "Arial",
		fontSize: 28,
		fill: 0xffffff,
		fontWeight: "bold",
	},
});

livesText.x = 20;
livesText.y = 60;
app.stage.addChild(livesText);

const gameOver = new PIXI.Text({
	text: "Game Over!",
	style: {
		fontFamily: "Arial",
		fontSize: 40,
		fill: 0xffffff,
		fontWeight: "bold",
	},
});

gameOver.x = app.screen.width / 2 - gameOver.width / 2;
gameOver.y = app.screen.height / 2 - gameOver.height / 2;
app.stage.addChild(gameOver);
gameOver.visible = false;

// track which keys are currently held down
const keys = {};

window.addEventListener("keydown", (e) => {
	keys[e.code] = true;

	if (e.code === "Space" && fireCooldown <= 0) {
		// Create a bullet
		const bullet = new PIXI.Graphics();
		bullet.rect(-3, -10, 6, 20).fill(0xffff00); // thin yellow rectangle

		// Start at the player's position
		bullet.x = player.x;
		bullet.y = player.y;

		app.stage.addChild(bullet);
		bullets.push(bullet);

		fireCooldown = 10; // a cooldown to prevent spamming
	}
});

window.addEventListener("keyup", (e) => {
	keys[e.code] = false;
});

const bullets = []; // to track all active bullets
let fireCooldown = 0;

let enemyHP = 1;
let enemySpeed = 1;
let lives = 100;
const enemyStartX = Math.random() * (app.screen.width - 100) + 50;

function spawnEnemy() {
	enemy.destroyed;
	enemy.x = Math.random() * (app.screen.width - 100) + 50; // random x between 50 and width-50
	enemy.y = Math.random();
	enemy.tint = 0xff0000;
	enemyHP = 1;
	console.log("New enemy spawned at x:", enemy.x);
	console.log("New enemy spawned at y:", enemy.y);
}

app.ticker.add((ticker) => {
	const playerSpeed = 10;
	const dx = playerSpeed * ticker.deltaTime;

	if (fireCooldown > 0) fireCooldown--;

	// only move enemy if it's alive
	if (!enemy.destroyed) {
		enemy.y += enemySpeed * ticker.deltaTime;
		// enemy.x = enemyStartX;

		// if enemy reached bottom then respawn
		if (enemy.y > app.screen.height) {
			lives -= 1;

			livesText.text = "Lives: " + lives;
			console.log("Enemy escaped! Lives remaining:", lives);
			if (lives === 0) {
				console.log("Game Over!");
				gameOver.visible = true;
				app.ticker.stop();
			} else {
				spawnEnemy();
			}
		}
	}

	if (keys["ArrowLeft"]) player.x = Math.max(25, player.x - dx);
	if (keys["ArrowRight"])
		player.x = Math.min(app.screen.width - 25, player.x + dx);
	if (keys["ArrowUp"]) player.y = Math.max(25, player.y - dx);
	if (keys["ArrowDown"])
		player.y = Math.min(app.screen.height - 25, player.y + dx);

	// bullets and enemy interaction
	for (let i = bullets.length - 1; i >= 0; i--) {
		const b = bullets[i];
		b.y -= 20 * ticker.deltaTime;

		// Off screen remove
		if (b.y < 0) {
			app.stage.removeChild(b);
			b.destroy();
			bullets.splice(i, 1);
			continue; // skip collision check for this bullet
		}

		// collision check if enemy is alive
		if (!enemy.destroyed) {
			const distx = b.x - enemy.x;
			const disty = b.y - enemy.y;
			const distance = Math.sqrt(distx * distx + disty * disty);

			if (distance < 25) {
				// bullet hit the enemy so remove the bullet and reduce enemy HP
				app.stage.removeChild(b);
				b.destroy();
				bullets.splice(i, 1);

				enemyHP--;
				console.log("Hit! HP remaining:", enemyHP);

				if (enemyHP <= 0) {
					console.log("Enemy destroyed!");
					app.stage.removeChild(enemy);
					enemy.destroy();

					score += 10;
					scoreText.text = "Score: " + score;

					enemySpeed += 0.2;

					// Spawn new one after 1 second
					setTimeout(() => {
						const newEnemy = new PIXI.Graphics();
						newEnemy.circle(0, 0, 20).fill(0xff0000);
						newEnemy.x =
							Math.random() * (app.screen.width - 100) + 50; // random x between 50 and width-50

						newEnemy.y = Math.random() + 50;
						app.stage.addChild(newEnemy);
						// reassign the enemy variable
						enemy = newEnemy;
						enemyHP = 1;
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

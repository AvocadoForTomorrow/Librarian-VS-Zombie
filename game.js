// ------------------------------
// PreloadScene: Load assets and generate textures
// ------------------------------
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }
  preload() {
    // Load sprites (keys are case-sensitive)
    this.load.image('Freyja', 'assets/Freyja.png');
    this.load.image('zombie', 'assets/zombie.png');
    this.load.image('terminal', 'assets/terminal.png');

    // Generate a bookshelf texture with a visible border.
    let gfx = this.add.graphics();
    gfx.fillStyle(0xCD853F, 1); // Peru color for the shelf
    gfx.fillRect(0, 0, 120, 60);
    gfx.lineStyle(4, 0x8B4513, 1); // Darker brown border
    gfx.strokeRect(0, 0, 120, 60);
    gfx.generateTexture('bookshelf', 120, 60);
    gfx.destroy();
  }
  create() {
    // Start the main gameplay scene at level 1
    this.scene.start('GameScene', { level: 1 });
  }
}

// ------------------------------
// GameScene: Main gameplay (chase level) with hard border and obstacles
// ------------------------------
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }
  init(data) {
    this.level = data.level || 1;
  }
  create() {
    // Create the player (librarian) using the "Freyja" sprite with display size 200×200 pixels
    this.player = this.physics.add.sprite(50, 300, 'Freyja').setDisplaySize(50, 50);
    
    // Create the terminal as a static sprite
    this.terminal = this.physics.add.staticSprite(700, 500, 'terminal').setScale(0.5);
    
    // Create obstacles (bookshelves) as a static group.
    // Adding 5 bookshelves with different sizes and positions.
    this.obstacles = this.physics.add.staticGroup();
    this.obstacles.create(300, 150, 'bookshelf').setDisplaySize(120, 60).refreshBody();
    this.obstacles.create(500, 350, 'bookshelf').setDisplaySize(120, 60).refreshBody();
    this.obstacles.create(600, 200, 'bookshelf').setDisplaySize(120, 60).refreshBody();
    this.obstacles.create(800, 100, 'bookshelf').setDisplaySize(150, 80).refreshBody();
    this.obstacles.create(200, 500, 'bookshelf').setDisplaySize(100, 50).refreshBody();
    
    // Create zombies group – number increases with level.
    // Each zombie will be displayed at 400×400 pixels.
    this.zombies = this.physics.add.group();
    let zombieCount = 5 + (this.level - 1) * 2;
    for (let i = 0; i < zombieCount; i++) {
      let x = Phaser.Math.Between(650, 750);
      let y = Phaser.Math.Between(50, 550);
      this.zombies.create(x, y, 'zombie').setDisplaySize(100, 100);
    }
    
    // Set up collisions between player/zombies and obstacles.
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.zombies, this.obstacles);
    
    // Overlap: player with terminal to enter puzzle mode.
    this.physics.add.overlap(this.player, this.terminal, () => {
      this.scene.start('PuzzleScene', { level: this.level });
    });
    // Overlap: player with zombies triggers game over.
    this.physics.add.overlap(this.player, this.zombies, () => {
      this.scene.start('GameOverScene', { level: this.level });
    });
    
    // Set up keyboard controls.
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Add a hard border around the gameplay area.
    this.border = this.add.graphics();
    this.border.lineStyle(8, 0x000000, 1);
    this.border.strokeRect(0, 0, this.game.config.width, this.game.config.height);
  }
  update() {
    // Touchscreen control: if pointer is down, move towards pointer.
    if (this.input.pointer1.isDown) {
      let pointer = this.input.pointer1;
      let dx = pointer.worldX - this.player.x;
      let dy = pointer.worldY - this.player.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        let speed = 200;
        this.player.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      } else {
        this.player.setVelocity(0);
      }
    } else {
      // Otherwise, use keyboard controls.
      this.player.setVelocity(0);
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-200);
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(200);
      }
      if (this.cursors.up.isDown) {
        this.player.setVelocityY(-200);
      } else if (this.cursors.down.isDown) {
        this.player.setVelocityY(200);
      }
    }
    
    // Make zombies chase the player.
    this.zombies.children.iterate((zombie) => {
      if (zombie) {
        this.physics.moveToObject(zombie, this.player, 100);
      }
    });
  }
}

// ------------------------------
// PuzzleScene: Terminal puzzle mode with math questions
// Updated to avoid removing all children each frame.
// ------------------------------
class PuzzleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PuzzleScene' });
  }
  init(data) {
    this.level = data.level || 1;
    this.questionIndex = 0;
    this.numQuestions = 3;
    this.questions = [];
    for (let i = 0; i < this.numQuestions; i++) {
      this.questions.push(this.generateQuestion());
    }
    this.currentQuestion = this.questions[this.questionIndex];
    this.inputText = '';
    this.startTime = this.time.now;
    this.timeLimit = 60000; // 60 seconds per question
  }
  // Generate a math question (multiplication, sorting, word, or prealgebra)
  generateQuestion() {
    let types = ['multiplication', 'sorting', 'word', 'prealgebra'];
    let type = Phaser.Utils.Array.GetRandom(types);
    if (type === 'multiplication') {
      let a = Phaser.Math.Between(1, 12);
      let b = Phaser.Math.Between(1, 12);
      return { text: `What is ${a} x ${b}?`, answer: (a * b).toString() };
    } else if (type === 'sorting') {
      let n = 3 + this.level;
      let numbers = [];
      for (let i = 0; i < n; i++) {
        numbers.push(Phaser.Math.Between(1, 50));
      }
      let sorted = numbers.slice().sort((a, b) => a - b);
      return { text: `Sort these numbers: ${numbers.join(" ")}`, answer: sorted.join(" ") };
    } else if (type === 'word') {
      let subTypes = ['candy_add', 'candy_sub'];
      let subType = Phaser.Utils.Array.GetRandom(subTypes);
      if (subType === 'candy_add') {
        let x = Phaser.Math.Between(1, 20);
        let y = Phaser.Math.Between(1, 20);
        return { text: `If you have ${x} candies and get ${y} more, how many?`, answer: (x + y).toString() };
      } else {
        let x = Phaser.Math.Between(10, 30);
        let y = Phaser.Math.Between(1, x);
        return { text: `If you have ${x} candies and give away ${y}, how many left?`, answer: (x - y).toString() };
      }
    } else { // prealgebra: for example, a(x + b) = c
      let a = Phaser.Math.Between(1, 5);
      let b = Phaser.Math.Between(1, 10);
      let xVal = Phaser.Math.Between(1, 10);
      let c = a * (xVal + b);
      return { text: `Solve for x: ${a}(x + ${b}) = ${c}`, answer: xVal.toString() };
    }
  }
  create() {
    // Create persistent text objects instead of clearing all children every frame.
    this.questionNumberText = this.add.text(10, 10, '', { font: '32px monospace', fill: '#000' });
    this.questionText = this.add.text(10, 50, '', { font: '32px monospace', fill: '#000' });
    this.answerText = this.add.text(10, 100, '', { font: '32px monospace', fill: '#000' });
    this.timerText = this.add.text(10, 150, '', { font: '32px monospace', fill: '#f00' });
    
    // Listen for keyboard input.
    this.input.keyboard.on('keydown', this.handleKey, this);
  }
  handleKey(event) {
    if (event.key === 'Backspace') {
      this.inputText = this.inputText.slice(0, -1);
    } else if (event.key === 'Enter') {
      if (this.inputText.trim() === this.currentQuestion.answer) {
        this.questionIndex++;
        if (this.questionIndex < this.numQuestions) {
          this.currentQuestion = this.questions[this.questionIndex];
          this.inputText = '';
          this.startTime = this.time.now;
        } else {
          // Completed all questions—level cleared!
          if (this.level < 5) {
            this.scene.start('GameScene', { level: this.level + 1 });
          } else {
            this.scene.start('WinScene');
          }
        }
      } else {
        // Wrong answer ends the game.
        this.scene.start('GameOverScene', { level: this.level });
      }
    } else {
      // Allow alphanumeric characters and common symbols.
      if (/^[0-9a-zA-Z+\-()*= ]$/.test(event.key)) {
        this.inputText += event.key;
      }
    }
  }
  update(time, delta) {
    let elapsed = time - this.startTime;
    let remaining = Math.max(0, Math.floor((this.timeLimit - elapsed) / 1000));
    if (remaining === 0) {
      this.scene.start('GameOverScene', { level: this.level });
    }
    // Update text objects.
    this.questionNumberText.setText(`Question ${this.questionIndex + 1} of ${this.numQuestions}`);
    this.questionText.setText(this.currentQuestion.text);
    this.answerText.setText(`Your answer: ${this.inputText}`);
    this.timerText.setText(`Time remaining: ${remaining} seconds`);
  }
}

// ------------------------------
// GameOverScene: With Restart Y/N toggle
// ------------------------------
class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }
  init(data) {
    this.level = data.level || 1;
    this.waitingForRestart = true;
    this.restartPrompt = "Restart game? (Y/N)";
  }
  create() {
    this.cameras.main.setBackgroundColor('#ffffff');
    this.add.text(200, 200, 'GAME OVER', { font: '48px monospace', fill: '#ff0000' });
    this.promptText = this.add.text(200, 300, this.restartPrompt, { font: '32px monospace', fill: '#000' });
    this.input.keyboard.on('keydown-Y', () => {
      if (this.waitingForRestart) {
        this.scene.start('GameScene', { level: 1 });
      }
    }, this);
    this.input.keyboard.on('keydown-N', () => {
      if (this.waitingForRestart) {
        this.promptText.setText("Thanks for playing!");
        this.waitingForRestart = false;
      }
    }, this);
  }
}

// ------------------------------
// WinScene
// ------------------------------
class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
  }
  create() {
    this.cameras.main.setBackgroundColor('#ffffff');
    this.add.text(150, 250, 'CONGRATULATIONS! YOU WIN!', { font: '48px monospace', fill: '#00ff00' });
    this.add.text(150, 350, 'Press any key to restart.', { font: '32px monospace', fill: '#000' });
    this.input.keyboard.once('keydown', () => {
      this.scene.start('GameScene', { level: 1 });
    });
  }
}

// ------------------------------
// Phaser Game Configuration
// ------------------------------
const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  backgroundColor: '#ffffff',
  pixelArt: true,       // Ensures crisp rendering for pixel art and text
  roundPixels: true,    // Rounds positions to whole pixels
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [PreloadScene, GameScene, PuzzleScene, GameOverScene, WinScene]
};

const game = new Phaser.Game(config);

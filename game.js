// ------------------------------
// PreloadScene: Load assets
// ------------------------------
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }
  preload() {
    this.load.image('librarian', 'assets/Freyja.png');
    this.load.image('zombie', 'assets/zombie.png');
    this.load.image('terminal', 'assets/terminal.png');
    // Optionally you can load an image for bookshelves or create obstacles with graphics
  }
  create() {
    // Start the main game scene with level 1
    this.scene.start('GameScene', { level: 1 });
  }
}

// ------------------------------
// GameScene: Main gameplay (chase level)
// ------------------------------
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }
  init(data) {
    this.level = data.level || 1;
  }
  create() {
    // Create the player (librarian)
    this.player = this.physics.add.sprite(50, 300, 'librarian').setScale(0.5);
    // Create the terminal as a static sprite
    this.terminal = this.physics.add.staticSprite(700, 500, 'terminal').setScale(0.5);
    
    // Create obstacles (bookshelves) as a static group
    this.obstacles = this.physics.add.staticGroup();
    // Example obstacles – you can adjust positions and sizes as desired
    this.obstacles.create(300, 100, 'terminal')  // using the terminal image as a placeholder
      .setScale(0.5).refreshBody();
    this.obstacles.create(400, 400, 'terminal')
      .setScale(0.5).refreshBody();
    
    // Create zombies group – number increases with level
    this.zombies = this.physics.add.group();
    let zombieCount = 5 + (this.level - 1) * 2;
    for (let i = 0; i < zombieCount; i++) {
      let x = Phaser.Math.Between(650, 750);
      let y = Phaser.Math.Between(50, 550);
      this.zombies.create(x, y, 'zombie').setScale(0.5);
    }
    
    // Set up collisions
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.zombies, this.obstacles);
    
    // Overlap between player and terminal triggers puzzle mode
    this.physics.add.overlap(this.player, this.terminal, () => {
      this.scene.start('PuzzleScene', { level: this.level });
    });
    // Overlap between player and zombies triggers game over
    this.physics.add.overlap(this.player, this.zombies, () => {
      this.scene.start('GameOverScene', { level: this.level });
    });
    
    // Set up arrow keys for player movement
    this.cursors = this.input.keyboard.createCursorKeys();
  }
  update() {
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
    // Make zombies chase the player
    this.zombies.children.iterate((zombie) => {
      if (zombie) {
        this.physics.moveToObject(zombie, this.player, 100);
      }
    });
  }
}

// ------------------------------
// PuzzleScene: Terminal puzzle mode
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
  // Updated generateQuestion now includes a "prealgebra" option
  generateQuestion() {
    // Randomly choose a type among multiplication, sorting, word, or prealgebra
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
    } else { // prealgebra
      // Generate a linear equation with parentheses: e.g., a(x + b) = c
      let a = Phaser.Math.Between(1, 5);
      let b = Phaser.Math.Between(1, 10);
      let xVal = Phaser.Math.Between(1, 10);
      let c = a * (xVal + b);
      return { text: `Solve for x: ${a}(x + ${b}) = ${c}`, answer: xVal.toString() };
    }
  }
  create() {
    // Listen for keyboard input
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
          // Completed all questions – level cleared!
          if (this.level < 5) {
            this.scene.start('GameScene', { level: this.level + 1 });
          } else {
            this.scene.start('WinScene');
          }
        }
      } else {
        // Wrong answer ends game
        this.scene.start('GameOverScene', { level: this.level });
      }
    } else {
      // Allow numbers, letters, spaces, and common symbols for algebra answers
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
    // Clear previous texts and draw updated texts
    this.cameras.main.setBackgroundColor('#ffffff');
    this.add.text(10, 10, `Question ${this.questionIndex + 1} of ${this.numQuestions}`, { font: '24px Arial', fill: '#000' });
    this.add.text(10, 50, this.currentQuestion.text, { font: '24px Arial', fill: '#000' });
    this.add.text(10, 100, `Your answer: ${this.inputText}`, { font: '24px Arial', fill: '#000' });
    this.add.text(10, 150, `Time remaining: ${remaining} seconds`, { font: '24px Arial', fill: '#f00' });
  }
}

// ------------------------------
// GameOverScene: Now with Restart Y/N toggle
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
    this.add.text(200, 200, 'GAME OVER', { font: '48px Arial', fill: '#ff0000' });
    this.promptText = this.add.text(200, 300, this.restartPrompt, { font: '32px Arial', fill: '#000' });
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
    this.add.text(150, 250, 'CONGRATULATIONS! YOU WIN!', { font: '48px Arial', fill: '#00ff00' });
    this.add.text(150, 350, 'Press any key to restart.', { font: '32px Arial', fill: '#000' });
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
  width: 800,
  height: 600,
  backgroundColor: '#ffffff',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [PreloadScene, GameScene, PuzzleScene, GameOverScene, WinScene]
};

const game = new Phaser.Game(config);

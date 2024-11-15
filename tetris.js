class Tetris {
    constructor() {
        this.COLS = 10;
        this.ROWS = 20;
        this.BLOCK_SIZE = 30;
        this.board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(0));
        
        // 创建canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.COLS * this.BLOCK_SIZE;
        this.canvas.height = this.ROWS * this.BLOCK_SIZE;
        document.getElementById('gameBoard').appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // 创建预览canvas
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = 120;
        this.previewCanvas.height = 120;
        document.getElementById('nextBlock').appendChild(this.previewCanvas);
        this.previewCtx = this.previewCanvas.getContext('2d');

        // 游戏状态
        this.isPlaying = false;
        this.gameOver = false;
        this.score = 0;
        this.level = 1;
        this.currentBlock = null;
        this.nextBlock = null;
        this.ghostBlock = null;

        // 定义方块形状
        this.shapes = {
            I: [[1,1,1,1]],
            O: [[1,1],[1,1]],
            T: [[0,1,0],[1,1,1]],
            S: [[0,1,1],[1,1,0]],
            Z: [[1,1,0],[0,1,1]],
            J: [[1,0,0],[1,1,1]],
            L: [[0,0,1],[1,1,1]]
        };

        // 键盘状态
        this.keys = {
            left: false,
            right: false,
            down: false,
            up: false,
            space: false
        };
        
        // 按键冷却时间(ms)
        this.keyCooldown = {
            left: 0,
            right: 0,
            down: 0,
            up: 0,
            space: 0
        };
        
        // 按键配置
        this.keyConfig = {
            cooldownTime: 100,
            repeatDelay: 200,
            repeatInterval: 50
        };

        // 添加难度相关属性
        this.speedLevels = {
            easy: { baseSpeed: 1000, speedIncrease: 100 },
            medium: { baseSpeed: 750, speedIncrease: 150 },
            hard: { baseSpeed: 500, speedIncrease: 200 }
        };
        this.currentSpeed = this.speedLevels.easy.baseSpeed;
        
        // 添加分数相关属性
        this.highScore = parseInt(localStorage.getItem('tetrisHighScore')) || 0;
        document.getElementById('highScore').textContent = this.highScore;
        
        // 初始化难度选择
        this.initDifficulty();

        // 初始化
        this.initButtons();
        this.initKeyboardHandling();
        this.gradients = this.createGradients();
    }

    // 初始化按钮
    initButtons() {
        document.getElementById('startBtn').onclick = () => this.start();
        document.getElementById('pauseBtn').onclick = () => this.pause();
    }

    // 创建方块
    createBlock() {
        const types = Object.keys(this.shapes);
        const type = types[Math.floor(Math.random() * types.length)];
        const shape = JSON.parse(JSON.stringify(this.shapes[type])); // 深拷贝形状
        
        return {
            type,
            shape,
            x: Math.floor((this.COLS - shape[0].length) / 2),
            y: 0
        };
    }

    // 更新幽灵方块
    updateGhostBlock() {
        if (!this.currentBlock) return;
        
        this.ghostBlock = {
            type: this.currentBlock.type,
            shape: this.currentBlock.shape,
            x: this.currentBlock.x,
            y: this.currentBlock.y
        };

        while (this.isValidMove(this.ghostBlock.x, this.ghostBlock.y + 1, this.ghostBlock.shape)) {
            this.ghostBlock.y++;
        }
    }

    // 移动方块
    moveBlock(dx, dy) {
        if (!this.currentBlock) return false;
        
        const newX = this.currentBlock.x + dx;
        const newY = this.currentBlock.y + dy;
        
        if (this.isValidMove(newX, newY, this.currentBlock.shape)) {
            this.currentBlock.x = newX;
            this.currentBlock.y = newY;
            this.updateGhostBlock();
            return true;
        }
        return false;
    }

    // 合并方块
    mergeBlock() {
        if (!this.currentBlock) return;

        for (let row = 0; row < this.currentBlock.shape.length; row++) {
            for (let col = 0; col < this.currentBlock.shape[row].length; col++) {
                if (this.currentBlock.shape[row][col]) {
                    const boardY = this.currentBlock.y + row;
                    if (boardY < 0) {
                        this.endGame();
                        return;
                    }
                    this.board[boardY][this.currentBlock.x + col] = this.currentBlock.type;
                }
            }
        }
        
        this.checkLines();
        this.currentBlock = this.nextBlock;
        this.nextBlock = this.createBlock();
        this.updateGhostBlock();

        // 检查新方块是否可以放置
        if (!this.isValidMove(this.currentBlock.x, this.currentBlock.y, this.currentBlock.shape)) {
            this.endGame();
        }
    }

    // 游戏结束处理
    endGame() {
        this.isPlaying = false;
        this.gameOver = true;
        
        if (this.score > this.highScore) {
            const modal = document.getElementById('highScoreModal');
            modal.style.display = 'block';
            
            document.getElementById('saveScore').onclick = () => {
                const playerName = document.getElementById('playerName').value.trim();
                if (playerName) {
                    localStorage.setItem('tetrisHighScore', this.score);
                    localStorage.setItem('tetrisHighScoreName', playerName);
                    modal.style.display = 'none';
                }
            };
        } else {
            alert('游戏结束！得分：' + this.score);
        }
    }

    // 暂停游戏
    pause() {
        if (this.gameOver) return;
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            this.lastTime = null; // 重置时间，防止暂停后突然下落
            requestAnimationFrame(this.gameLoop.bind(this));
        }
        document.getElementById('pauseBtn').textContent = 
            this.isPlaying ? '暂停' : '继续';
    }

    // 检查消行
    checkLines() {
        let linesCleared = 0;
        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell)) {
                this.board.splice(row, 1);
                this.board.unshift(Array(this.COLS).fill(0));
                linesCleared++;
                row++; // 重新检查当前行
            }
        }
        
        if (linesCleared > 0) {
            // 更新分数（根据消除行数和等级计算）
            const basePoints = [0, 100, 300, 500, 800]; // 消除1-4行的基础分
            this.score += basePoints[linesCleared] * this.level;
            document.getElementById('score').textContent = this.score;
            
            // 更新最高分
            if (this.score > this.highScore) {
                this.highScore = this.score;
                document.getElementById('highScore').textContent = this.highScore;
                localStorage.setItem('tetrisHighScore', this.highScore);
            }
            
            // 更新等级
            this.updateLevel();
        }
    }

    // 创建并缓存方块的渐变色
    createGradients() {
        const gradients = {};
        const colors = {
            I: ['#00FFFF', '#00CCCC'],
            O: ['#FFFF00', '#CCCC00'],
            T: ['#FF00FF', '#CC00CC'],
            S: ['#00FF00', '#00CC00'],
            Z: ['#FF0000', '#CC0000'],
            J: ['#0000FF', '#0000CC'],
            L: ['#FF8800', '#CC6600']
        };

        for (let [type, [color1, color2]] of Object.entries(colors)) {
            const gradient = this.ctx.createLinearGradient(0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            gradients[type] = gradient;
        }

        return gradients;
    }

    initKeyboardHandling() {
        document.addEventListener('keydown', (e) => {
            if (!this.isPlaying) return;
            
            switch(e.key) {
                case 'ArrowLeft': 
                    this.keys.left = true;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.keys.right = true;
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    this.keys.down = true;
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    if (!this.keys.up) {
                        this.rotateBlock();
                        this.keys.up = true;
                    }
                    e.preventDefault();
                    break;
                case ' ':
                    if (!this.keys.space) {
                        while(this.moveBlock(0, 1)) {}
                        this.mergeBlock();
                        this.keys.space = true;
                    }
                    e.preventDefault();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowLeft': this.keys.left = false; break;
                case 'ArrowRight': this.keys.right = false; break;
                case 'ArrowDown': this.keys.down = false; break;
                case 'ArrowUp': this.keys.up = false; break;
                case ' ': this.keys.space = false; break;
            }
        });
    }

    handleInput(deltaTime) {
        const now = Date.now();
        
        // 处理左右移动
        if (this.keys.left && now > this.keyCooldown.left) {
            this.moveBlock(-1, 0);
            this.keyCooldown.left = now + this.keyConfig.repeatInterval;
        }
        if (this.keys.right && now > this.keyCooldown.right) {
            this.moveBlock(1, 0);
            this.keyCooldown.right = now + this.keyConfig.repeatInterval;
        }
        
        // 处理加速下落
        if (this.keys.down && now > this.keyCooldown.down) {
            this.moveBlock(0, 1);
            this.keyCooldown.down = now + this.keyConfig.repeatInterval;
        }
    }

    drawBlock(ctx, x, y, type, isGhost = false) {
        ctx.save();
        if (isGhost) {
            ctx.globalAlpha = 0.3;
        }
        
        ctx.fillStyle = this.gradients[type];
        ctx.fillRect(
            x * this.BLOCK_SIZE, 
            y * this.BLOCK_SIZE, 
            this.BLOCK_SIZE, 
            this.BLOCK_SIZE
        );
        
        // 绘制边框
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            x * this.BLOCK_SIZE, 
            y * this.BLOCK_SIZE, 
            this.BLOCK_SIZE, 
            this.BLOCK_SIZE
        );
        
        ctx.restore();
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.ROWS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, i * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
        for (let i = 0; i <= this.COLS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(i * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 绘制固定的方块
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                if (this.board[row][col]) {
                    this.drawBlock(this.ctx, col, row, this.board[row][col]);
                }
            }
        }
        
        // 绘制幽灵方块
        if (this.ghostBlock) {
            for (let row = 0; row < this.ghostBlock.shape.length; row++) {
                for (let col = 0; col < this.ghostBlock.shape[row].length; col++) {
                    if (this.ghostBlock.shape[row][col]) {
                        this.drawBlock(
                            this.ctx,
                            this.ghostBlock.x + col,
                            this.ghostBlock.y + row,
                            this.ghostBlock.type,
                            true
                        );
                    }
                }
            }
        }
        
        // 绘制当前方块
        if (this.currentBlock) {
            for (let row = 0; row < this.currentBlock.shape.length; row++) {
                for (let col = 0; col < this.currentBlock.shape[row].length; col++) {
                    if (this.currentBlock.shape[row][col]) {
                        this.drawBlock(
                            this.ctx,
                            this.currentBlock.x + col,
                            this.currentBlock.y + row,
                            this.currentBlock.type
                        );
                    }
                }
            }
        }

        // 绘制预览方块
        this.drawPreview();
    }

    drawPreview() {
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        if (this.nextBlock) {
            const blockSize = 30;
            const offsetX = (this.previewCanvas.width - this.nextBlock.shape[0].length * blockSize) / 2;
            const offsetY = (this.previewCanvas.height - this.nextBlock.shape.length * blockSize) / 2;

            for (let row = 0; row < this.nextBlock.shape.length; row++) {
                for (let col = 0; col < this.nextBlock.shape[row].length; col++) {
                    if (this.nextBlock.shape[row][col]) {
                        this.drawBlock(
                            this.previewCtx,
                            col + offsetX / blockSize,
                            row + offsetY / blockSize,
                            this.nextBlock.type
                        );
                    }
                }
            }
        }
    }

    gameLoop(timestamp) {
        if (!this.isPlaying || this.gameOver) return;

        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // 处理输入
        this.handleInput(deltaTime);

        // 更新游戏状态
        this.dropCounter = (this.dropCounter || 0) + deltaTime;
        if (this.dropCounter > this.currentSpeed) {
            if (!this.moveBlock(0, 1)) {
                this.mergeBlock();
            }
            this.dropCounter = 0;
        }

        // 渲染
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    start() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.gameOver = false;
        this.board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(0));
        this.score = 0;
        this.currentBlock = this.createBlock();
        this.nextBlock = this.createBlock();
        this.updateGhostBlock();
        this.lastTime = null;
        this.dropCounter = 0;
        
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    isValidMove(x, y, shape) {
        if (!shape) return false;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    // 检查水平边界
                    if (newX < 0 || newX >= this.COLS) {
                        return false;
                    }
                    
                    // 检查底部边界
                    if (newY >= this.ROWS) {
                        return false;
                    }
                    
                    // 检查与其他方块的碰撞（只在游戏区域内检查）
                    if (newY >= 0 && this.board[newY][newX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    rotateBlock() {
        if (!this.currentBlock) return;

        // 计算旋转后的形状（顺时针旋转90度）
        const rotated = this.currentBlock.shape[0].map((_, i) => 
            this.currentBlock.shape.map(row => row[i]).reverse()
        );
        
        // 尝试直接旋转
        if (this.isValidMove(this.currentBlock.x, this.currentBlock.y, rotated)) {
            this.currentBlock.shape = rotated;
            this.updateGhostBlock();
            return;
        }
        
        // 尝试左右移动后旋转（墙踢）
        const kicks = [
            {x: -1, y: 0}, // 左移一格
            {x: 1, y: 0},  // 右移一格
            {x: -2, y: 0}, // 左移两格
            {x: 2, y: 0},  // 右移两格
            {x: 0, y: -1}  // 上移一格（用于某些特殊情况）
        ];

        for (let kick of kicks) {
            const newX = this.currentBlock.x + kick.x;
            const newY = this.currentBlock.y + kick.y;
            
            if (this.isValidMove(newX, newY, rotated)) {
                this.currentBlock.x = newX;
                this.currentBlock.y = newY;
                this.currentBlock.shape = rotated;
                this.updateGhostBlock();
                return;
            }
        }
    }

    initDifficulty() {
        const difficultySelect = document.getElementById('difficulty');
        difficultySelect.onchange = (e) => {
            const difficulty = e.target.value;
            const speedConfig = this.speedLevels[difficulty];
            this.currentSpeed = speedConfig.baseSpeed;
            this.level = 1;
            document.getElementById('level').textContent = this.level;
        };
    }

    updateLevel() {
        // 每1000分升一级
        const newLevel = Math.floor(this.score / 1000) + 1;
        if (newLevel !== this.level) {
            this.level = newLevel;
            document.getElementById('level').textContent = this.level;
            // 更新速度
            const difficulty = document.getElementById('difficulty').value;
            const speedConfig = this.speedLevels[difficulty];
            this.currentSpeed = Math.max(100, 
                speedConfig.baseSpeed - (this.level - 1) * speedConfig.speedIncrease);
        }
    }
} 

// 初始化游戏
window.onload = () => {
    new Tetris();
}; 
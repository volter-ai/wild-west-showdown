export class GameSimulation {
  constructor(gameInterface, users, width, height) {
    this.gameInterface = gameInterface;
    this.gameTimer = 3000; // 30 seconds in ms
    this.isGameOver = false;
    
    this.gameState = {
      entities: {},
      jail: {
        x: width / 2,
        y: height / 2
      },
      screenSize: {
        width,
        height
      },
      timeRemaining: this.gameTimer,
      isGameOver: this.isGameOver
    };

    // Create player entities
    Object.keys(users).forEach(userId => {
      this.gameState.entities[userId] = {
        id: userId,
        name: users[userId].name, // Add the name from users object
        x: Math.random() * width,
        y: Math.random() * height,
        dx: 0,
        dy: 0,
        state: 'idle',
        direction: 'right',
        isBot: false,
        isTagged: false,
        inJail: false,
        isDashing: false,
        dashCooldown: 0,
        dashDx: 0,
        dashDy: 0
      };
    });

    // Create tagger bot and regular bot
    this.gameState.entities['bot1'] = {
      id: 'bot1',
      x: Math.random() * width,
      y: Math.random() * height,
      dx: 0,
      dy: 0,
      state: 'idle',
      direction: 'right',
      isBot: true,
      isTagger: true,
      isTagged: false,
      inJail: false,
      isDashing: false,
      dashCooldown: 0,
      dashDx: 0,
      dashDy: 0
    };

    this.gameState.entities['bot2'] = {
      id: 'bot2',
      x: Math.random() * width,
      y: Math.random() * height,
      dx: 0,
      dy: 0,
      state: 'idle',
      direction: 'right',
      isBot: true,
      isTagger: false,
      isTagged: false,
      inJail: false,
      isDashing: false,
      dashCooldown: 0,
      dashDx: 0,
      dashDy: 0
    };

    this.gameInterface.on('joystick_move', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && !entity.isDashing) {
        entity.dx = data.dx;
        entity.dy = data.dy;
        entity.state = (data.dx === 0 && data.dy === 0) ? 'idle' : 'walking';
        if (data.dx !== 0) {
          entity.direction = data.dx > 0 ? 'right' : 'left';
        }
      }
    });

    this.gameInterface.on('dash', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && !entity.isDashing && entity.dashCooldown <= 0) {
        entity.isDashing = true;
        entity.dashCooldown = 100; // 1 second cooldown
        
        // Store dash direction
        if (entity.dx === 0 && entity.dy === 0) {
          entity.dashDx = 0;
          entity.dashDy = -1;
        } else {
          const magnitude = Math.sqrt(entity.dx * entity.dx + entity.dy * entity.dy);
          entity.dashDx = entity.dx / magnitude;
          entity.dashDy = entity.dy / magnitude;
        }
      }
    });
  }

  checkCollision(entity1, entity2) {
    const distance = Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    );
    return distance < 40; // Collision radius
  }

  getResults() {
    const jailedPlayers = Object.values(this.gameState.entities).filter(e => e.inJail && !e.isBot);
    const freePlayers = Object.values(this.gameState.entities).filter(e => !e.inJail && !e.isBot);
    return {
      winners: freePlayers.map(p => p.name),
      losers: jailedPlayers.map(p => p.name)
    };
  }

  update(deltaTime) {
    if (this.isGameOver) return;

    // Update timer
    this.gameTimer -= deltaTime;
    this.gameState.timeRemaining = Math.max(0, this.gameTimer);
    
    if (this.gameTimer <= 0) {
      this.isGameOver = true;
      this.gameState.isGameOver = true;
      this.gameState.results = this.getResults();
      this.gameInterface.sendGameEvent('game_state_update', this.gameState);
      return;
    }

    // Bot movement
    Object.values(this.gameState.entities).forEach(entity => {
      if (entity.isBot) {
        if (Math.random() < 0.02) {
          entity.dx = (Math.random() - 0.5) * (entity.isTagger ? 3 : 2); // Tagger moves faster
          entity.dy = (Math.random() - 0.5) * (entity.isTagger ? 3 : 2);
          entity.state = 'walking';
          if (entity.dx !== 0) {
            entity.direction = entity.dx > 0 ? 'right' : 'left';
          }
        }
      }
    });

    // Update positions
    Object.values(this.gameState.entities).forEach(entity => {
      if (!entity.inJail) {
        const speed = entity.isDashing ? 15 : 1; // Dash is 15x normal speed
        if (entity.isDashing) {
          entity.x += entity.dashDx * deltaTime * 0.1 * speed;
          entity.y += entity.dashDy * deltaTime * 0.1 * speed;
          // End dash after 10 frames
          if (Math.random() < 0.1) {
            entity.isDashing = false;
          }
        } else {
          entity.x += entity.dx * deltaTime * 0.1 * speed;
          entity.y += entity.dy * deltaTime * 0.1 * speed;
        }

        // Keep entities within bounds
        entity.x = Math.max(0, Math.min(entity.x, this.gameState.screenSize.width));
        entity.y = Math.max(0, Math.min(entity.y, this.gameState.screenSize.height));
        
        if (entity.dashCooldown > 0) {
          entity.dashCooldown -= deltaTime;
        }
      } else {
        // Keep jailed players in jail
        entity.x = this.gameState.jail.x;
        entity.y = this.gameState.jail.y;
      }
    });

    // Check for tagging
    const tagger = this.gameState.entities['bot1'];
    Object.values(this.gameState.entities).forEach(entity => {
      if (entity.id !== 'bot1' && !entity.inJail && !entity.isTagged) {
        if (this.checkCollision(tagger, entity)) {
          entity.isTagged = true;
          entity.inJail = true;
          entity.x = this.gameState.jail.x;
          entity.y = this.gameState.jail.y;
        }
      }
    });

    // Check for rescuing
    Object.values(this.gameState.entities).forEach(rescuer => {
      if (!rescuer.isTagged && !rescuer.inJail && !rescuer.isTagger) {
        Object.values(this.gameState.entities).forEach(jailed => {
          if (jailed.inJail && this.checkCollision(rescuer, jailed)) {
            jailed.inJail = false;
            jailed.isTagged = false;
          }
        });
      }
    });

    this.gameInterface.sendGameEvent('game_state_update', this.gameState);
  }
}

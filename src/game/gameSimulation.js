export class GameSimulation {
  constructor(gameInterface, users, width, height) {
    this.gameInterface = gameInterface;
    this.gameTimer = 120000; // 2 minutes in ms
    this.isGameOver = false;
    
    // Create the game world
    this.gameState = {
      entities: {},
      buildings: [
        { x: 200, y: 200, width: 150, height: 100, type: 'saloon' },
        { x: 500, y: 200, width: 150, height: 100, type: 'bank' },
        { x: 800, y: 200, width: 150, height: 100, type: 'sheriff' },
        { x: 350, y: 600, width: 150, height: 100, type: 'store' },
        { x: 650, y: 600, width: 150, height: 100, type: 'stable' }
      ],
      goldMines: [
        { x: 150, y: 800, radius: 50 },
        { x: 850, y: 800, radius: 50 },
        { x: 500, y: 400, radius: 50 }
      ],
      screenSize: {
        width,
        height
      },
      worldSize: {
        width: 1200,
        height: 1200
      },
      timeRemaining: this.gameTimer,
      isGameOver: this.isGameOver,
      leaderboard: []
    };

    // Create player entities
    Object.keys(users).forEach(userId => {
      this.gameState.entities[userId] = {
        id: userId,
        name: users[userId].name,
        x: 400 + Math.random() * 400,
        y: 400 + Math.random() * 400,
        dx: 0,
        dy: 0,
        state: 'idle',
        direction: 'right',
        isBot: false,
        health: 100,
        maxHealth: 100,
        gold: 0,
        ammo: 6,
        maxAmmo: 6,
        reloading: false,
        reloadTime: 0,
        shootCooldown: 0,
        miningProgress: 0,
        isMining: false,
        eliminated: false,
        respawnTime: 0,
        score: 0,
        speed: 0.15
      };
    });

    // Create sheriff bot
    this.gameState.entities['sheriff'] = {
      id: 'sheriff',
      name: 'Sheriff',
      x: 800,
      y: 250,
      dx: 0,
      dy: 0,
      state: 'idle',
      direction: 'left',
      isBot: true,
      botType: 'sheriff',
      health: 150,
      maxHealth: 150,
      gold: 0,
      ammo: 12,
      maxAmmo: 12,
      reloading: false,
      reloadTime: 0,
      shootCooldown: 0,
      patrolPoints: [
        { x: 800, y: 250 },
        { x: 800, y: 350 },
        { x: 700, y: 350 },
        { x: 700, y: 250 }
      ],
      currentPatrolPoint: 0,
      speed: 0.1
    };

    // Create bandit bots
    for (let i = 1; i <= 2; i++) {
      this.gameState.entities[`bandit${i}`] = {
        id: `bandit${i}`,
        name: `Bandit ${i}`,
        x: 200 + Math.random() * 800,
        y: 200 + Math.random() * 800,
        dx: 0,
        dy: 0,
        state: 'idle',
        direction: 'right',
        isBot: true,
        botType: 'bandit',
        health: 80,
        maxHealth: 80,
        gold: 10,
        ammo: 6,
        maxAmmo: 6,
        reloading: false,
        reloadTime: 0,
        shootCooldown: 0,
        targetId: null,
        speed: 0.12
      };
    }

    // Handle player movement
    this.gameInterface.on('joystick_move', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && !entity.eliminated) {
        entity.dx = data.dx;
        entity.dy = data.dy;
        entity.state = (data.dx === 0 && data.dy === 0) ? 'idle' : 'walking';
        if (data.dx !== 0) {
          entity.direction = data.dx > 0 ? 'right' : 'left';
        }
        
        // Stop mining if moving
        if (entity.isMining && (data.dx !== 0 || data.dy !== 0)) {
          entity.isMining = false;
          entity.miningProgress = 0;
        }
      }
    });

    // Handle shooting
    this.gameInterface.on('shoot', (data) => {
      const shooter = this.gameState.entities[data.userId];
      if (shooter && !shooter.eliminated && shooter.ammo > 0 && shooter.shootCooldown <= 0 && !shooter.reloading) {
        shooter.ammo--;
        shooter.shootCooldown = 500; // 0.5 second cooldown
        shooter.state = 'shooting';
        
        // Create bullet entity
        const bulletId = `bullet_${data.userId}_${Date.now()}`;
        const direction = shooter.direction === 'right' ? 1 : -1;
        
        this.gameState.entities[bulletId] = {
          id: bulletId,
          x: shooter.x + (direction * 30),
          y: shooter.y - 10,
          dx: direction * 0.5,
          dy: 0,
          ownerId: shooter.id,
          isBullet: true,
          damage: 20,
          lifespan: 2000 // 2 seconds
        };
      }
    });

    // Handle reload
    this.gameInterface.on('reload', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && !entity.eliminated && !entity.reloading && entity.ammo < entity.maxAmmo) {
        entity.reloading = true;
        entity.reloadTime = 2000; // 2 seconds to reload
        entity.state = 'reloading';
      }
    });

    // Handle mining
    this.gameInterface.on('mine', (data) => {
      const miner = this.gameState.entities[data.userId];
      if (miner && !miner.eliminated && !miner.isMining) {
        // Check if near a gold mine
        const nearMine = this.gameState.goldMines.find(mine => {
          const distance = Math.sqrt(
            Math.pow(miner.x - mine.x, 2) + 
            Math.pow(miner.y - mine.y, 2)
          );
          return distance < mine.radius + 30;
        });
        
        if (nearMine) {
          miner.isMining = true;
          miner.miningProgress = 0;
          miner.state = 'mining';
          miner.dx = 0;
          miner.dy = 0;
        }
      }
    });
  }

  checkCollision(entity1, entity2, radius = 40) {
    const distance = Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    );
    return distance < radius;
  }

  isNearGoldMine(entity) {
    return this.gameState.goldMines.some(mine => {
      const distance = Math.sqrt(
        Math.pow(entity.x - mine.x, 2) + 
        Math.pow(entity.y - mine.y, 2)
      );
      return distance < mine.radius + 30;
    });
  }

  updateBotBehavior(bot, deltaTime) {
    if (bot.eliminated) return;
    
    // Sheriff patrol behavior
    if (bot.botType === 'sheriff') {
      const target = bot.patrolPoints[bot.currentPatrolPoint];
      const distToTarget = Math.sqrt(
        Math.pow(bot.x - target.x, 2) + 
        Math.pow(bot.y - target.y, 2)
      );
      
      if (distToTarget < 10) {
        bot.currentPatrolPoint = (bot.currentPatrolPoint + 1) % bot.patrolPoints.length;
      } else {
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        bot.dx = dx / magnitude;
        bot.dy = dy / magnitude;
        bot.state = 'walking';
        bot.direction = dx > 0 ? 'right' : 'left';
      }
      
      // Sheriff shoots at bandits
      if (bot.ammo > 0 && bot.shootCooldown <= 0) {
        const bandits = Object.values(this.gameState.entities).filter(e => 
          e.botType === 'bandit' && !e.eliminated);
        
        for (const bandit of bandits) {
          const distance = Math.sqrt(
            Math.pow(bot.x - bandit.x, 2) + 
            Math.pow(bot.y - bandit.y, 2)
          );
          
          if (distance < 300) {
            bot.direction = bandit.x > bot.x ? 'right' : 'left';
            bot.state = 'shooting';
            bot.ammo--;
            bot.shootCooldown = 1000;
            
            // Create bullet
            const bulletId = `bullet_${bot.id}_${Date.now()}`;
            const direction = bot.direction === 'right' ? 1 : -1;
            
            this.gameState.entities[bulletId] = {
              id: bulletId,
              x: bot.x + (direction * 30),
              y: bot.y - 10,
              dx: direction * 0.5,
              dy: 0,
              ownerId: bot.id,
              isBullet: true,
              damage: 25,
              lifespan: 2000
            };
            break;
          }
        }
      }
      
      // Sheriff reloads
      if (bot.ammo === 0 && !bot.reloading) {
        bot.reloading = true;
        bot.reloadTime = 2000;
        bot.state = 'reloading';
      }
    }
    
    // Bandit behavior
    if (bot.botType === 'bandit') {
      // Find target if none
      if (!bot.targetId || Math.random() < 0.01) {
        const players = Object.values(this.gameState.entities).filter(e => 
          !e.isBot && !e.eliminated && e.id !== bot.id);
        
        if (players.length > 0) {
          const randomPlayer = players[Math.floor(Math.random() * players.length)];
          bot.targetId = randomPlayer.id;
        }
      }
      
      // Move toward target
      if (bot.targetId && this.gameState.entities[bot.targetId]) {
        const target = this.gameState.entities[bot.targetId];
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        // Only move if not too close
        if (magnitude > 150) {
          bot.dx = dx / magnitude;
          bot.dy = dy / magnitude;
          bot.state = 'walking';
        } else {
          bot.dx = 0;
          bot.dy = 0;
          bot.state = 'idle';
        }
        
        bot.direction = dx > 0 ? 'right' : 'left';
        
        // Shoot at target
        if (bot.ammo > 0 && bot.shootCooldown <= 0 && magnitude < 300) {
          bot.state = 'shooting';
          bot.ammo--;
          bot.shootCooldown = 1500;
          
          // Create bullet
          const bulletId = `bullet_${bot.id}_${Date.now()}`;
          const direction = bot.direction === 'right' ? 1 : -1;
          
          this.gameState.entities[bulletId] = {
            id: bulletId,
            x: bot.x + (direction * 30),
            y: bot.y - 10,
            dx: direction * 0.5,
            dy: 0,
            ownerId: bot.id,
            isBullet: true,
            damage: 15,
            lifespan: 2000
          };
        }
      } else {
        // Random movement if no target
        if (Math.random() < 0.02) {
          bot.dx = (Math.random() - 0.5) * 2;
          bot.dy = (Math.random() - 0.5) * 2;
          bot.state = 'walking';
          bot.direction = bot.dx > 0 ? 'right' : 'left';
        }
      }
      
      // Bandit reloads
      if (bot.ammo === 0 && !bot.reloading) {
        bot.reloading = true;
        bot.reloadTime = 3000;
        bot.state = 'reloading';
      }
    }
  }

  getResults() {
    // Sort players by score (gold + eliminations)
    const players = Object.values(this.gameState.entities).filter(e => !e.isBot);
    players.sort((a, b) => b.score - a.score);
    
    return {
      winners: players.slice(0, Math.ceil(players.length / 2)).map(p => p.name),
      losers: players.slice(Math.ceil(players.length / 2)).map(p => p.name),
      leaderboard: players.map(p => ({
        name: p.name,
        gold: p.gold,
        score: p.score
      }))
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
      return;
    }

    // Update bot behavior
    Object.values(this.gameState.entities).forEach(entity => {
      if (entity.isBot) {
        this.updateBotBehavior(entity, deltaTime);
      }
    });

    // Update positions and states
    Object.values(this.gameState.entities).forEach(entity => {
      // Skip bullets (handled separately)
      if (entity.isBullet) return;
      
      // Handle respawning
      if (entity.eliminated) {
        entity.respawnTime -= deltaTime;
        if (entity.respawnTime <= 0) {
          entity.eliminated = false;
          entity.health = entity.maxHealth;
          entity.x = 400 + Math.random() * 400;
          entity.y = 400 + Math.random() * 400;
          entity.state = 'idle';
          entity.ammo = entity.maxAmmo;
          entity.reloading = false;
        }
        return;
      }
      
      // Update position
      entity.x += entity.dx * deltaTime * entity.speed;
      entity.y += entity.dy * deltaTime * entity.speed;

      // Constrain to world bounds
      entity.x = Math.max(0, Math.min(entity.x, this.gameState.worldSize.width));
      entity.y = Math.max(0, Math.min(entity.y, this.gameState.worldSize.height));
      
      // Update cooldowns
      if (entity.shootCooldown > 0) {
        entity.shootCooldown -= deltaTime;
        if (entity.shootCooldown <= 0 && entity.state === 'shooting') {
          entity.state = 'idle';
        }
      }
      
      // Handle reloading
      if (entity.reloading) {
        entity.reloadTime -= deltaTime;
        if (entity.reloadTime <= 0) {
          entity.reloading = false;
          entity.ammo = entity.maxAmmo;
          entity.state = 'idle';
        }
      }
      
      // Handle mining
      if (entity.isMining) {
        if (this.isNearGoldMine(entity)) {
          entity.miningProgress += deltaTime;
          if (entity.miningProgress >= 3000) { // 3 seconds to mine gold
            entity.gold += 5;
            entity.score += 5;
            entity.miningProgress = 0;
            entity.isMining = false;
            entity.state = 'idle';
          }
        } else {
          entity.isMining = false;
          entity.miningProgress = 0;
          entity.state = 'idle';
        }
      }
    });

    // Update bullets
    Object.values(this.gameState.entities).forEach(bullet => {
      if (bullet.isBullet) {
        // Move bullet
        bullet.x += bullet.dx * deltaTime;
        bullet.y += bullet.dy * deltaTime;
        
        // Check for bullet collisions with entities
        Object.values(this.gameState.entities).forEach(entity => {
          if (!entity.isBullet && !entity.eliminated && entity.id !== bullet.ownerId) {
            if (this.checkCollision(bullet, entity, 20)) {
              // Hit detected
              entity.health -= bullet.damage;
              
              // Check if entity is eliminated
              if (entity.health <= 0) {
                entity.health = 0;
                entity.eliminated = true;
                entity.respawnTime = 5000; // 5 seconds to respawn
                
                // Award points to shooter if it's a player
                const shooter = this.gameState.entities[bullet.ownerId];
                if (shooter && !shooter.isBot) {
                  shooter.score += 10;
                }
              }
              
              // Remove bullet
              delete this.gameState.entities[bullet.id];
            }
          }
        });
        
        // Check for bullet collisions with buildings
        this.gameState.buildings.forEach(building => {
          if (bullet.x > building.x - building.width/2 && 
              bullet.x < building.x + building.width/2 && 
              bullet.y > building.y - building.height/2 && 
              bullet.y < building.y + building.height/2) {
            delete this.gameState.entities[bullet.id];
          }
        });
        
        // Remove bullet if it goes out of bounds or expires
        bullet.lifespan -= deltaTime;
        if (bullet.lifespan <= 0 || 
            bullet.x < 0 || 
            bullet.x > this.gameState.worldSize.width || 
            bullet.y < 0 || 
            bullet.y > this.gameState.worldSize.height) {
          delete this.gameState.entities[bullet.id];
        }
      }
    });

    // Update leaderboard
    const players = Object.values(this.gameState.entities)
      .filter(e => !e.isBot)
      .map(p => ({
        name: p.name,
        gold: p.gold,
        score: p.score
      }))
      .sort((a, b) => b.score - a.score);
    
    this.gameState.leaderboard = players;
  }
}

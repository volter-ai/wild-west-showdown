export class GameSimulation {
      constructor(gameInterface, users, width, height) {
        this.gameInterface = gameInterface;
        this.gameTimer = 120000; // 120 seconds in ms
        this.isGameOver = false;
    
        this.gameState = {
          entities: {},
          bullets: [],
          powerUps: [],
          safeZone: {
            radius: 600, // Start with full map
            x: 600, // Center of 1200x1200 world
            y: 600
          },
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
          shrinkStartTime: 30000, // Start shrinking after 30 seconds
          shrinkRate: 0.5 // Units per second
        };

        // Create player entities
        Object.keys(users).forEach(userId => {
          this.gameState.entities[userId] = this.createPlayer(userId, users[userId].name, false);
        });

        // Create bot players
        for (let i = 1; i <= 3; i++) {
          const botId = `bot${i}`;
          this.gameState.entities[botId] = this.createPlayer(botId, `Bot ${i}`, true);
        }

        // Create initial power-ups
        this.spawnPowerUps(3);

        // Set up event listeners
        this.gameInterface.on('joystick_move', (data) => {
          const entity = this.gameState.entities[data.userId];
          if (entity && !entity.isDead) {
            entity.dx = data.dx;
            entity.dy = data.dy;
            entity.state = (data.dx === 0 && data.dy === 0) ? 'idle' : 'walking';
            if (data.dx !== 0) {
              entity.direction = data.dx > 0 ? 'right' : 'left';
            }
          }
        });

        this.gameInterface.on('shoot', (data) => {
          const entity = this.gameState.entities[data.userId];
          if (entity && !entity.isDead && entity.shootCooldown <= 0) {
            entity.shootCooldown = entity.shootSpeed;
        
            // Create bullet
            const angle = Math.atan2(data.targetY - entity.y, data.targetX - entity.x);
            this.gameState.bullets.push({
              id: Date.now() + Math.random(),
              x: entity.x,
              y: entity.y,
              dx: Math.cos(angle) * 0.5,
              dy: Math.sin(angle) * 0.5,
              ownerId: entity.id,
              damage: entity.gunPower,
              timeToLive: 2000 // 2 seconds
            });
          }
        });

        this.gameInterface.on('take_cover', (data) => {
          const entity = this.gameState.entities[data.userId];
          if (entity && !entity.isDead) {
            entity.isCovered = !entity.isCovered;
          }
        });
      }

      createPlayer(id, name, isBot) {
        // Random position within the world bounds
        const x = Math.random() * 1200;
        const y = Math.random() * 1200;
    
        return {
          id,
          name: name || 'Cowboy',
          x,
          y,
          dx: 0,
          dy: 0,
          state: 'idle',
          direction: 'right',
          isBot,
          isDead: false,
          isCovered: false,
          health: 100,
          speed: 0.15,
          shootCooldown: 0,
          shootSpeed: 500, // ms between shots
          gunPower: 25,
          hat: Math.floor(Math.random() * 3) // 0, 1, or 2 for different hat styles
        };
      }

      spawnPowerUps(count) {
        const types = ['health', 'speed', 'gun'];
    
        for (let i = 0; i < count; i++) {
          this.gameState.powerUps.push({
            id: Date.now() + Math.random(),
            x: Math.random() * 1200,
            y: Math.random() * 1200,
            type: types[Math.floor(Math.random() * types.length)]
          });
        }
      }

      checkCollision(entity1, entity2, radius = 40) {
        const distance = Math.sqrt(
          Math.pow(entity1.x - entity2.x, 2) + 
          Math.pow(entity1.y - entity2.y, 2)
        );
        return distance < radius;
      }

      isInSafeZone(entity) {
        const distance = Math.sqrt(
          Math.pow(entity.x - this.gameState.safeZone.x, 2) + 
          Math.pow(entity.y - this.gameState.safeZone.y, 2)
        );
        return distance <= this.gameState.safeZone.radius;
      }

      getResults() {
        const alivePlayers = Object.values(this.gameState.entities).filter(e => !e.isDead && !e.isBot);
        const deadPlayers = Object.values(this.gameState.entities).filter(e => e.isDead && !e.isBot);
    
        return {
          winners: alivePlayers.map(p => p.name),
          losers: deadPlayers.map(p => p.name)
        };
      }

      update(deltaTime) {
        if (this.isGameOver) return;

        // Update timer
        this.gameTimer -= deltaTime;
        this.gameState.timeRemaining = Math.max(0, this.gameTimer);
    
        // Check for game over conditions
        const alivePlayers = Object.values(this.gameState.entities).filter(e => !e.isDead);
        if (this.gameTimer <= 0 || alivePlayers.length <= 1) {
          this.isGameOver = true;
          this.gameState.isGameOver = true;
          this.gameState.results = this.getResults();
          return;
        }

        // Shrink safe zone after certain time
        if (this.gameTimer < (this.gameState.timeRemaining - this.gameState.shrinkStartTime) && 
            this.gameState.safeZone.radius > 100) {
          this.gameState.safeZone.radius -= this.gameState.shrinkRate * (deltaTime / 1000);
        }

        // Bot AI
        Object.values(this.gameState.entities).forEach(entity => {
          if (entity.isBot && !entity.isDead) {
            // Random movement
            if (Math.random() < 0.02) {
              entity.dx = (Math.random() - 0.5) * 2;
              entity.dy = (Math.random() - 0.5) * 2;
              entity.state = 'walking';
              if (entity.dx !== 0) {
                entity.direction = entity.dx > 0 ? 'right' : 'left';
              }
            }
        
            // Random shooting
            if (Math.random() < 0.05 && entity.shootCooldown <= 0) {
              // Find nearest player
              let nearestPlayer = null;
              let minDistance = Infinity;
          
              Object.values(this.gameState.entities).forEach(target => {
                if (target.id !== entity.id && !target.isDead) {
                  const distance = Math.sqrt(
                    Math.pow(entity.x - target.x, 2) + 
                    Math.pow(entity.y - target.y, 2)
                  );
              
                  if (distance < minDistance) {
                    minDistance = distance;
                    nearestPlayer = target;
                  }
                }
              });
          
              if (nearestPlayer) {
                entity.shootCooldown = entity.shootSpeed;
            
                // Create bullet
                const angle = Math.atan2(nearestPlayer.y - entity.y, nearestPlayer.x - entity.x);
                this.gameState.bullets.push({
                  id: Date.now() + Math.random(),
                  x: entity.x,
                  y: entity.y,
                  dx: Math.cos(angle) * 0.5,
                  dy: Math.sin(angle) * 0.5,
                  ownerId: entity.id,
                  damage: entity.gunPower,
                  timeToLive: 2000
                });
              }
            }
        
            // Random take cover
            if (Math.random() < 0.01) {
              entity.isCovered = !entity.isCovered;
            }
          }
        });

        // Update positions
        Object.values(this.gameState.entities).forEach(entity => {
          if (!entity.isDead) {
            // Covered players move slower
            const coverFactor = entity.isCovered ? 0.5 : 1;
        
            entity.x += entity.dx * deltaTime * entity.speed * coverFactor;
            entity.y += entity.dy * deltaTime * entity.speed * coverFactor;

            // Constrain to world bounds
            entity.x = Math.max(0, Math.min(entity.x, this.gameState.worldSize.width));
            entity.y = Math.max(0, Math.min(entity.y, this.gameState.worldSize.height));
        
            // Update cooldowns
            if (entity.shootCooldown > 0) {
              entity.shootCooldown -= deltaTime;
            }
        
            // Check if outside safe zone
            if (!this.isInSafeZone(entity)) {
              entity.health -= 0.1 * (deltaTime / 1000);
              if (entity.health <= 0) {
                entity.isDead = true;
              }
            }
          }
        });

        // Update bullets
        this.gameState.bullets = this.gameState.bullets.filter(bullet => {
          // Move bullet
          bullet.x += bullet.dx * deltaTime;
          bullet.y += bullet.dy * deltaTime;
      
          // Check for collisions with players
          let hitPlayer = false;
      
          Object.values(this.gameState.entities).forEach(entity => {
            if (entity.id !== bullet.ownerId && !entity.isDead && this.checkCollision(bullet, entity, 20)) {
              hitPlayer = true;
          
              // Covered players take less damage
              const damageFactor = entity.isCovered ? 0.5 : 1;
              entity.health -= bullet.damage * damageFactor;
          
              if (entity.health <= 0) {
                entity.isDead = true;
              }
            }
          });
      
          // Check for bullet lifetime
          bullet.timeToLive -= deltaTime;
      
          // Keep bullet if it's still alive and hasn't hit anything
          return !hitPlayer && bullet.timeToLive > 0 && 
                 bullet.x >= 0 && bullet.x <= this.gameState.worldSize.width &&
                 bullet.y >= 0 && bullet.y <= this.gameState.worldSize.height;
        });

        // Check for power-up collisions
        this.gameState.powerUps = this.gameState.powerUps.filter(powerUp => {
          let collected = false;
      
          Object.values(this.gameState.entities).forEach(entity => {
            if (!entity.isDead && this.checkCollision(powerUp, entity)) {
              collected = true;
          
              // Apply power-up effect
              switch (powerUp.type) {
                case 'health':
                  entity.health = Math.min(100, entity.health + 50);
                  break;
                case 'speed':
                  entity.speed *= 1.2;
                  break;
                case 'gun':
                  entity.gunPower *= 1.5;
                  entity.shootSpeed *= 0.8;
                  break;
              }
            }
          });
      
          return !collected;
        });
    
        // Spawn new power-ups occasionally
        if (Math.random() < 0.005) {
          this.spawnPowerUps(1);
        }
      }
    }
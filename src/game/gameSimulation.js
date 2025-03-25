export class GameSimulation {
  constructor(gameInterface, users, width, height) {
    this.gameInterface = gameInterface;
    this.gameTimer = 120000; // 2 minutes in ms
    this.isGameOver = false;
    this.gameMode = "Deathmatch"; // Default game mode
    this.dayNightCycle = 0; // 0-100, 0 = day, 100 = night
    this.dayNightDirection = 1; // 1 = getting darker, -1 = getting lighter
    
    // Define character types and their properties
    this.characterTypes = {
      Sheriff: { health: 120, speed: 0.09, specialAbility: "stun" },
      Outlaw: { health: 100, speed: 0.11, specialAbility: "dualWield" },
      BountyHunter: { health: 110, speed: 0.1, specialAbility: "tracking" }
    };
    
    // Define weapon types and their properties
    this.weaponTypes = {
      revolver: { damage: 25, range: 300, fireRate: 800, ammo: 6, reloadTime: 2000 },
      shotgun: { damage: 40, range: 150, fireRate: 1200, ammo: 2, reloadTime: 2500 },
      rifle: { damage: 35, range: 500, fireRate: 1000, ammo: 4, reloadTime: 2200 },
      dynamite: { damage: 70, range: 100, fireRate: 2000, ammo: 1, reloadTime: 3000 }
    };
    
    // Define power-up types and their effects
    this.powerUpTypes = {
      speedBoost: { duration: 5000, effect: "speed" },
      quickReload: { duration: 10000, effect: "reload" },
      extraHealth: { duration: 0, effect: "health" }
    };
    
    this.gameState = {
      entities: {},
      projectiles: {},
      collectibles: {},
      hazards: {},
      screenSize: {
        width,
        height
      },
      worldSize: {
        width: 2000,
        height: 2000
      },
      timeRemaining: this.gameTimer,
      isGameOver: this.isGameOver,
      gameMode: this.gameMode,
      dayNightCycle: this.dayNightCycle
    };

    // Create player entities
    const characterOptions = ["Sheriff", "Outlaw", "BountyHunter"];
    let playerCount = 0;
    
    Object.keys(users).forEach(userId => {
      const characterType = characterOptions[playerCount % characterOptions.length];
      const typeProps = this.characterTypes[characterType];
      
      this.gameState.entities[userId] = {
        id: userId,
        name: users[userId].name,
        x: 200 + Math.random() * 1600,
        y: 200 + Math.random() * 1600,
        dx: 0,
        dy: 0,
        state: 'idle',
        direction: 'right',
        isBot: false,
        characterType: characterType,
        health: typeProps.health,
        maxHealth: typeProps.health,
        speed: typeProps.speed,
        gold: 0,
        weapon: "revolver",
        ammo: this.weaponTypes.revolver.ammo,
        maxAmmo: this.weaponTypes.revolver.ammo,
        lastShot: 0,
        reloading: false,
        reloadStartTime: 0,
        powerUps: [],
        alive: true,
        score: 0
      };
      
      playerCount++;
    });

    // Create bot players to fill slots (up to 8 total players)
    const botNames = ["Wild Bill", "Jesse James", "Calamity Jane", "Billy the Kid", "Doc Holliday", "Annie Oakley"];
    const totalPlayers = Object.keys(users).length;
    const botsNeeded = Math.min(8 - totalPlayers, 4); // Add up to 4 bots, max 8 total players
    
    for (let i = 0; i < botsNeeded; i++) {
      const botId = `bot${i+1}`;
      const characterType = characterOptions[(totalPlayers + i) % characterOptions.length];
      const typeProps = this.characterTypes[characterType];
      
      this.gameState.entities[botId] = {
        id: botId,
        name: botNames[i % botNames.length],
        x: 200 + Math.random() * 1600,
        y: 200 + Math.random() * 1600,
        dx: 0,
        dy: 0,
        state: 'idle',
        direction: 'right',
        isBot: true,
        characterType: characterType,
        health: typeProps.health,
        maxHealth: typeProps.health,
        speed: typeProps.speed,
        gold: 0,
        weapon: "revolver",
        ammo: this.weaponTypes.revolver.ammo,
        maxAmmo: this.weaponTypes.revolver.ammo,
        lastShot: 0,
        reloading: false,
        reloadStartTime: 0,
        powerUps: [],
        alive: true,
        score: 0,
        botTarget: null,
        botActionTimer: 0
      };
    }

    // Create initial collectibles
    this.spawnCollectibles();
    
    // Create environmental hazards
    this.spawnHazards();

    // Handle player movement
    this.gameInterface.on('joystick_move', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && entity.alive) {
        entity.dx = data.dx;
        entity.dy = data.dy;
        entity.state = (data.dx === 0 && data.dy === 0) ? 'idle' : 'walking';
        if (data.dx !== 0) {
          entity.direction = data.dx > 0 ? 'right' : 'left';
        }
      }
    });

    // Handle shooting
    this.gameInterface.on('shoot', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && entity.alive && !entity.reloading && entity.ammo > 0) {
        const now = Date.now();
        const weapon = this.weaponTypes[entity.weapon];
        
        if (now - entity.lastShot >= weapon.fireRate) {
          entity.lastShot = now;
          entity.ammo--;
          entity.state = 'shooting';
          
          // Create projectile
          const projectileId = `proj_${data.userId}_${now}`;
          const angle = data.angle || (entity.direction === 'right' ? 0 : Math.PI);
          
          this.gameState.projectiles[projectileId] = {
            id: projectileId,
            ownerId: data.userId,
            x: entity.x,
            y: entity.y,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            speed: 0.5,
            damage: weapon.damage,
            range: weapon.range,
            distanceTraveled: 0,
            type: entity.weapon,
            createdAt: now
          };
          
          // Auto-reload when empty
          if (entity.ammo === 0) {
            entity.reloading = true;
            entity.reloadStartTime = now;
          }
        }
      }
    });

    // Handle reload
    this.gameInterface.on('reload', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && entity.alive && !entity.reloading && entity.ammo < this.weaponTypes[entity.weapon].ammo) {
        entity.reloading = true;
        entity.reloadStartTime = Date.now();
      }
    });

    // Handle weapon switch
    this.gameInterface.on('switch_weapon', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && entity.alive && data.weapon && this.weaponTypes[data.weapon]) {
        entity.weapon = data.weapon;
        entity.ammo = this.weaponTypes[data.weapon].ammo;
        entity.maxAmmo = this.weaponTypes[data.weapon].ammo;
        entity.reloading = false;
      }
    });

    // Handle special ability
    this.gameInterface.on('use_ability', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && entity.alive) {
        this.useSpecialAbility(entity);
      }
    });
  }

  spawnCollectibles() {
    // Spawn weapons
    const weapons = ["shotgun", "rifle", "dynamite"];
    for (let i = 0; i < 5; i++) {
      const collectibleId = `weapon_${i}`;
      const weaponType = weapons[Math.floor(Math.random() * weapons.length)];
      
      this.gameState.collectibles[collectibleId] = {
        id: collectibleId,
        type: "weapon",
        weaponType: weaponType,
        x: 100 + Math.random() * 1800,
        y: 100 + Math.random() * 1800
      };
    }
    
    // Spawn power-ups
    const powerUps = ["speedBoost", "quickReload", "extraHealth"];
    for (let i = 0; i < 5; i++) {
      const collectibleId = `powerup_${i}`;
      const powerUpType = powerUps[Math.floor(Math.random() * powerUps.length)];
      
      this.gameState.collectibles[collectibleId] = {
        id: collectibleId,
        type: "powerUp",
        powerUpType: powerUpType,
        x: 100 + Math.random() * 1800,
        y: 100 + Math.random() * 1800
      };
    }
    
    // Spawn gold
    for (let i = 0; i < 20; i++) {
      const collectibleId = `gold_${i}`;
      
      this.gameState.collectibles[collectibleId] = {
        id: collectibleId,
        type: "gold",
        value: 5 + Math.floor(Math.random() * 10),
        x: 100 + Math.random() * 1800,
        y: 100 + Math.random() * 1800
      };
    }
  }

  spawnHazards() {
    // Spawn stampeding cattle
    for (let i = 0; i < 2; i++) {
      const hazardId = `cattle_${i}`;
      const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      const position = Math.random() * 1800 + 100;
      
      this.gameState.hazards[hazardId] = {
        id: hazardId,
        type: "cattle",
        direction: direction,
        position: position,
        x: direction === 'horizontal' ? 0 : position,
        y: direction === 'vertical' ? 0 : position,
        active: false,
        cooldown: 10000 + Math.random() * 20000,
        lastActive: 0
      };
    }
    
    // Spawn mine cart tracks
    for (let i = 0; i < 3; i++) {
      const hazardId = `minecart_${i}`;
      const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      const position = Math.random() * 1800 + 100;
      
      this.gameState.hazards[hazardId] = {
        id: hazardId,
        type: "minecart",
        direction: direction,
        position: position,
        x: direction === 'horizontal' ? 0 : position,
        y: direction === 'vertical' ? 0 : position,
        active: false,
        cooldown: 15000 + Math.random() * 15000,
        lastActive: 0
      };
    }
    
    // Spawn saloon brawls
    for (let i = 0; i < 2; i++) {
      const hazardId = `saloon_${i}`;
      
      this.gameState.hazards[hazardId] = {
        id: hazardId,
        type: "saloon",
        x: 200 + Math.random() * 1600,
        y: 200 + Math.random() * 1600,
        radius: 150,
        active: false,
        cooldown: 30000 + Math.random() * 30000,
        lastActive: 0,
        duration: 10000
      };
    }
  }

  useSpecialAbility(entity) {
    switch (entity.characterType) {
      case "Sheriff":
        // Stun nearby enemies
        Object.values(this.gameState.entities).forEach(target => {
          if (target.id !== entity.id && target.alive) {
            const distance = this.getDistance(entity, target);
            if (distance < 200) {
              target.stunned = true;
              target.stunnedUntil = Date.now() + 3000;
            }
          }
        });
        break;
        
      case "Outlaw":
        // Dual wield - double fire rate temporarily
        entity.powerUps.push({
          type: "dualWield",
          startTime: Date.now(),
          duration: 5000
        });
        break;
        
      case "BountyHunter":
        // Tracking - reveal all players on minimap
        entity.powerUps.push({
          type: "tracking",
          startTime: Date.now(),
          duration: 10000
        });
        break;
    }
  }

  getDistance(entity1, entity2) {
    return Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    );
  }

  checkCollision(entity1, entity2, radius = 40) {
    const distance = this.getDistance(entity1, entity2);
    return distance < radius;
  }

  updateBots(deltaTime) {
    Object.values(this.gameState.entities).forEach(entity => {
      if (entity.isBot && entity.alive) {
        entity.botActionTimer -= deltaTime;
        
        if (entity.botActionTimer <= 0) {
          // Reset action timer
          entity.botActionTimer = 500 + Math.random() * 1500;
          
          // Find nearest player or collectible
          let nearestTarget = null;
          let nearestDistance = Infinity;
          
          // 70% chance to target a player, 30% chance to target a collectible
          if (Math.random() < 0.7) {
            Object.values(this.gameState.entities).forEach(target => {
              if (target.id !== entity.id && target.alive) {
                const distance = this.getDistance(entity, target);
                if (distance < nearestDistance) {
                  nearestDistance = distance;
                  nearestTarget = target;
                }
              }
            });
          } else {
            Object.values(this.gameState.collectibles).forEach(collectible => {
              const distance = this.getDistance(entity, collectible);
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestTarget = collectible;
              }
            });
          }
          
          if (nearestTarget) {
            entity.botTarget = nearestTarget;
            
            // Move towards target
            const dx = nearestTarget.x - entity.x;
            const dy = nearestTarget.y - entity.y;
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            
            if (magnitude > 0) {
              entity.dx = dx / magnitude;
              entity.dy = dy / magnitude;
              entity.direction = dx > 0 ? 'right' : 'left';
              entity.state = 'walking';
            }
            
            // Shoot if it's a player and in range
            if (nearestTarget.health !== undefined && nearestDistance < 300 && entity.ammo > 0 && !entity.reloading) {
              const angle = Math.atan2(dy, dx);
              
              // Create projectile
              const now = Date.now();
              const weapon = this.weaponTypes[entity.weapon];
              
              if (now - entity.lastShot >= weapon.fireRate) {
                entity.lastShot = now;
                entity.ammo--;
                entity.state = 'shooting';
                
                const projectileId = `proj_${entity.id}_${now}`;
                
                this.gameState.projectiles[projectileId] = {
                  id: projectileId,
                  ownerId: entity.id,
                  x: entity.x,
                  y: entity.y,
                  dx: Math.cos(angle),
                  dy: Math.sin(angle),
                  speed: 0.5,
                  damage: weapon.damage,
                  range: weapon.range,
                  distanceTraveled: 0,
                  type: entity.weapon,
                  createdAt: now
                };
                
                // Auto-reload when empty
                if (entity.ammo === 0) {
                  entity.reloading = true;
                  entity.reloadStartTime = now;
                }
              }
            }
            
            // Reload if needed
            if (entity.ammo === 0 && !entity.reloading) {
              entity.reloading = true;
              entity.reloadStartTime = Date.now();
            }
          } else {
            // Wander randomly
            entity.dx = (Math.random() - 0.5) * 2;
            entity.dy = (Math.random() - 0.5) * 2;
            entity.direction = entity.dx > 0 ? 'right' : 'left';
            entity.state = 'walking';
          }
        }
      }
    });
  }

  updateHazards(deltaTime) {
    const now = Date.now();
    
    Object.values(this.gameState.hazards).forEach(hazard => {
      if (!hazard.active && now - hazard.lastActive > hazard.cooldown) {
        // Activate hazard
        hazard.active = true;
        hazard.lastActive = now;
        
        if (hazard.type === "cattle" || hazard.type === "minecart") {
          // Reset position for moving hazards
          if (hazard.direction === 'horizontal') {
            hazard.x = 0;
          } else {
            hazard.y = 0;
          }
        }
      }
      
      if (hazard.active) {
        switch (hazard.type) {
          case "cattle":
          case "minecart":
            // Move hazard
            const speed = hazard.type === "cattle" ? 0.3 : 0.4;
            if (hazard.direction === 'horizontal') {
              hazard.x += speed * deltaTime;
              if (hazard.x > this.gameState.worldSize.width) {
                hazard.active = false;
              }
            } else {
              hazard.y += speed * deltaTime;
              if (hazard.y > this.gameState.worldSize.height) {
                hazard.active = false;
              }
            }
            
            // Check for collisions with players
            Object.values(this.gameState.entities).forEach(entity => {
              if (entity.alive) {
                let collision = false;
                
                if (hazard.direction === 'horizontal') {
                  collision = Math.abs(entity.y - hazard.position) < 50 && 
                              Math.abs(entity.x - hazard.x) < 50;
                } else {
                  collision = Math.abs(entity.x - hazard.position) < 50 && 
                              Math.abs(entity.y - hazard.y) < 50;
                }
                
                if (collision) {
                  entity.health -= hazard.type === "cattle" ? 30 : 40;
                  if (entity.health <= 0) {
                    entity.health = 0;
                    entity.alive = false;
                    entity.state = 'dead';
                  }
                }
              }
            });
            break;
            
          case "saloon":
            // Check if saloon brawl should end
            if (now - hazard.lastActive > hazard.duration) {
              hazard.active = false;
            } else {
              // Check for players in the saloon area
              Object.values(this.gameState.entities).forEach(entity => {
                if (entity.alive) {
                  const distance = this.getDistance(entity, hazard);
                  if (distance < hazard.radius) {
                    // Random chance to take damage in the brawl
                    if (Math.random() < 0.01) {
                      entity.health -= 10;
                      if (entity.health <= 0) {
                        entity.health = 0;
                        entity.alive = false;
                        entity.state = 'dead';
                      }
                    }
                  }
                }
              });
            }
            break;
        }
      }
    });
  }

  updateDayNightCycle(deltaTime) {
    // Update day/night cycle (0-100)
    this.dayNightCycle += this.dayNightDirection * 0.001 * deltaTime;
    
    if (this.dayNightCycle >= 100) {
      this.dayNightCycle = 100;
      this.dayNightDirection = -1;
    } else if (this.dayNightCycle <= 0) {
      this.dayNightCycle = 0;
      this.dayNightDirection = 1;
    }
    
    this.gameState.dayNightCycle = this.dayNightCycle;
  }

  getResults() {
    const players = Object.values(this.gameState.entities).filter(e => !e.isBot);
    
    if (this.gameMode === "Deathmatch") {
      const survivors = players.filter(p => p.alive);
      const dead = players.filter(p => !p.alive);
      
      return {
        winners: survivors.map(p => p.name),
        losers: dead.map(p => p.name)
      };
    } else if (this.gameMode === "Gold Rush") {
      // Sort players by gold collected
      const sortedPlayers = [...players].sort((a, b) => b.gold - a.gold);
      const winners = sortedPlayers.slice(0, Math.ceil(sortedPlayers.length / 2));
      const losers = sortedPlayers.slice(Math.ceil(sortedPlayers.length / 2));
      
      return {
        winners: winners.map(p => p.name),
        losers: losers.map(p => p.name)
      };
    }
    
    // Default fallback
    return {
      winners: players.filter(p => p.alive).map(p => p.name),
      losers: players.filter(p => !p.alive).map(p => p.name)
    };
  }

  update(deltaTime) {
    if (this.isGameOver) return;

    // Update timer
    this.gameTimer -= deltaTime;
    this.gameState.timeRemaining = Math.max(0, this.gameTimer);
    
    // Check for game over conditions
    const alivePlayers = Object.values(this.gameState.entities).filter(e => e.alive);
    
    if (this.gameTimer <= 0 || (this.gameMode === "Deathmatch" && alivePlayers.length <= 1)) {
      this.isGameOver = true;
      this.gameState.isGameOver = true;
      this.gameState.results = this.getResults();
      return;
    }

    // Update day/night cycle
    this.updateDayNightCycle(deltaTime);
    
    // Update bot AI
    this.updateBots(deltaTime);
    
    // Update hazards
    this.updateHazards(deltaTime);
    
    // Update player positions
    Object.values(this.gameState.entities).forEach(entity => {
      if (entity.alive) {
        // Check if stunned
        if (entity.stunned && Date.now() > entity.stunnedUntil) {
          entity.stunned = false;
        }
        
        // Don't move if stunned
        if (!entity.stunned) {
          // Apply power-up effects
          let speedMultiplier = 1;
          
          entity.powerUps = entity.powerUps.filter(powerUp => {
            const active = Date.now() - powerUp.startTime < powerUp.duration;
            
            if (active && powerUp.type === "speedBoost") {
              speedMultiplier = 1.5;
            }
            
            return active;
          });
          
          // Update position
          entity.x += entity.dx * deltaTime * entity.speed * speedMultiplier;
          entity.y += entity.dy * deltaTime * entity.speed * speedMultiplier;
          
          // Constrain to world bounds
          entity.x = Math.max(0, Math.min(entity.x, this.gameState.worldSize.width));
          entity.y = Math.max(0, Math.min(entity.y, this.gameState.worldSize.height));
        }
        
        // Handle reloading
        if (entity.reloading) {
          const now = Date.now();
          const weapon = this.weaponTypes[entity.weapon];
          let reloadTime = weapon.reloadTime;
          
          // Apply quick reload power-up
          entity.powerUps.forEach(powerUp => {
            if (powerUp.type === "quickReload" && 
                now - powerUp.startTime < powerUp.duration) {
              reloadTime *= 0.5;
            }
          });
          
          if (now - entity.reloadStartTime >= reloadTime) {
            entity.reloading = false;
            entity.ammo = weapon.ammo;
          }
        }
      }
    });
    
    // Update projectiles
    Object.keys(this.gameState.projectiles).forEach(projectileId => {
      const projectile = this.gameState.projectiles[projectileId];
      const moveDistance = projectile.speed * deltaTime;
      
      projectile.x += projectile.dx * moveDistance;
      projectile.y += projectile.dy * moveDistance;
      projectile.distanceTraveled += moveDistance;
      
      // Check if projectile has reached its range
      if (projectile.distanceTraveled >= projectile.range) {
        delete this.gameState.projectiles[projectileId];
        return;
      }
      
      // Check for collisions with players
      Object.values(this.gameState.entities).forEach(entity => {
        if (entity.id !== projectile.ownerId && entity.alive) {
          if (this.checkCollision(projectile, entity, 20)) {
            entity.health -= projectile.damage;
            
            if (entity.health <= 0) {
              entity.health = 0;
              entity.alive = false;
              entity.state = 'dead';
              
              // Award score to shooter
              const shooter = this.gameState.entities[projectile.ownerId];
              if (shooter) {
                shooter.score += 1;
              }
            }
            
            delete this.gameState.projectiles[projectileId];
          }
        }
      });
      
      // Check for out of bounds
      if (projectile.x < 0 || projectile.x > this.gameState.worldSize.width ||
          projectile.y < 0 || projectile.y > this.gameState.worldSize.height) {
        delete this.gameState.projectiles[projectileId];
      }
    });
    
    // Check for collectible pickups
    Object.keys(this.gameState.collectibles).forEach(collectibleId => {
      const collectible = this.gameState.collectibles[collectibleId];
      
      Object.values(this.gameState.entities).forEach(entity => {
        if (entity.alive && this.checkCollision(entity, collectible)) {
          switch (collectible.type) {
            case "weapon":
              entity.weapon = collectible.weaponType;
              entity.ammo = this.weaponTypes[collectible.weaponType].ammo;
              entity.maxAmmo = this.weaponTypes[collectible.weaponType].ammo;
              break;
              
            case "powerUp":
              entity.powerUps.push({
                type: collectible.powerUpType,
                startTime: Date.now(),
                duration: this.powerUpTypes[collectible.powerUpType].duration
              });
              
              // Apply immediate effects
              if (collectible.powerUpType === "extraHealth") {
                entity.health = Math.min(entity.maxHealth, entity.health + 30);
              }
              break;
              
            case "gold":
              entity.gold += collectible.value;
              break;
          }
          
          delete this.gameState.collectibles[collectibleId];
          
          // Spawn a new collectible elsewhere
          setTimeout(() => {
            const newCollectibleId = `${collectible.type}_${Date.now()}`;
            
            if (collectible.type === "weapon") {
              const weapons = ["shotgun", "rifle", "dynamite"];
              const weaponType = weapons[Math.floor(Math.random() * weapons.length)];
              
              this.gameState.collectibles[newCollectibleId] = {
                id: newCollectibleId,
                type: "weapon",
                weaponType: weaponType,
                x: 100 + Math.random() * 1800,
                y: 100 + Math.random() * 1800
              };
            } else if (collectible.type === "powerUp") {
              const powerUps = ["speedBoost", "quickReload", "extraHealth"];
              const powerUpType = powerUps[Math.floor(Math.random() * powerUps.length)];
              
              this.gameState.collectibles[newCollectibleId] = {
                id: newCollectibleId,
                type: "powerUp",
                powerUpType: powerUpType,
                x: 100 + Math.random() * 1800,
                y: 100 + Math.random() * 1800
              };
            } else if (collectible.type === "gold") {
              this.gameState.collectibles[newCollectibleId] = {
                id: newCollectibleId,
                type: "gold",
                value: 5 + Math.floor(Math.random() * 10),
                x: 100 + Math.random() * 1800,
                y: 100 + Math.random() * 1800
              };
            }
          }, 10000);
        }
      });
    });
  }
}

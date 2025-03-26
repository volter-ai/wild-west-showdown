export class GameSimulation {
  constructor(gameInterface, users, width, height) {
    this.gameInterface = gameInterface;
    this.gameTimer = 120000; // 2 minutes in ms
    this.isGameOver = false;
    this.spawnPowerUpTimer = 0;
    this.spawnGoldTimer = 0;
    
    // Define weapon types
    this.weaponTypes = {
      revolver: { damage: 25, range: 300, reloadTime: 1000, ammoCapacity: 6, bulletSpeed: 0.5, spread: 0.1 },
      shotgun: { damage: 40, range: 200, reloadTime: 1500, ammoCapacity: 2, bulletSpeed: 0.4, spread: 0.3 },
      rifle: { damage: 35, range: 500, reloadTime: 2000, ammoCapacity: 4, bulletSpeed: 0.6, spread: 0.05 },
      dynamite: { damage: 75, range: 150, reloadTime: 3000, ammoCapacity: 1, bulletSpeed: 0.3, spread: 0 }
    };
    
    // Define character types
    this.characterTypes = {
      sheriff: { health: 120, speed: 0.12, startingWeapon: 'revolver' },
      outlaw: { health: 100, speed: 0.15, startingWeapon: 'shotgun' },
      bountyHunter: { health: 110, speed: 0.13, startingWeapon: 'rifle' }
    };
    
    this.gameState = {
      entities: {},
      bullets: {},
      powerUps: {},
      gold: {},
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
      gameMode: 'deathmatch',
      dayNightCycle: 'day', // 'day' or 'night'
      dayNightTimer: 60000, // 1 minute per cycle
      nextBulletId: 1,
      nextPowerUpId: 1,
      nextGoldId: 1
    };

    // Create player entities
    const characterOptions = Object.keys(this.characterTypes);
    let playerCount = 0;
    
    Object.keys(users).forEach(userId => {
      const characterType = characterOptions[playerCount % characterOptions.length];
      const characterStats = this.characterTypes[characterType];
      const weaponType = characterStats.startingWeapon;
      const weaponStats = this.weaponTypes[weaponType];
      
      this.gameState.entities[userId] = {
        id: userId,
        name: users[userId].name,
        x: 200 + Math.random() * 1600,
        y: 200 + Math.random() * 1600,
        dx: 0,
        dy: 0,
        rotation: 0, // Facing angle in radians
        state: 'idle',
        direction: 'right',
        isBot: false,
        isDead: false,
        characterType: characterType,
        health: characterStats.health,
        maxHealth: characterStats.health,
        speed: characterStats.speed,
        gold: 0,
        
        // Weapon properties
        currentWeapon: weaponType,
        ammo: weaponStats.ammoCapacity,
        maxAmmo: weaponStats.ammoCapacity,
        isReloading: false,
        reloadTimer: 0,
        shootCooldown: 0,
        
        // Power-up effects
        speedBoost: 0,
        quickReload: 0,
        
        // Animation states
        isShooting: false,
        shootingTimer: 0
      };
      
      playerCount++;
    });

    // Create bot players to fill slots (up to 8 total players)
    const botTypes = ['sheriff', 'outlaw', 'bountyHunter'];
    const botNames = ['Doc Holliday', 'Billy the Kid', 'Jesse James', 'Calamity Jane', 'Wyatt Earp', 'Annie Oakley'];
    
    for (let i = 0; i < Math.min(8 - Object.keys(users).length, 3); i++) {
      const botId = `bot${i+1}`;
      const botType = botTypes[i % botTypes.length];
      const characterStats = this.characterTypes[botType];
      const weaponType = characterStats.startingWeapon;
      const weaponStats = this.weaponTypes[weaponType];
      
      this.gameState.entities[botId] = {
        id: botId,
        name: botNames[i % botNames.length],
        x: 200 + Math.random() * 1600,
        y: 200 + Math.random() * 1600,
        dx: 0,
        dy: 0,
        rotation: 0,
        state: 'idle',
        direction: 'right',
        isBot: true,
        isDead: false,
        characterType: botType,
        health: characterStats.health,
        maxHealth: characterStats.health,
        speed: characterStats.speed,
        gold: 0,
        
        // Weapon properties
        currentWeapon: weaponType,
        ammo: weaponStats.ammoCapacity,
        maxAmmo: weaponStats.ammoCapacity,
        isReloading: false,
        reloadTimer: 0,
        shootCooldown: 0,
        
        // Bot AI properties
        targetId: null,
        moveTimer: 0,
        decisionTimer: 0,
        
        // Power-up effects
        speedBoost: 0,
        quickReload: 0,
        
        // Animation states
        isShooting: false,
        shootingTimer: 0
      };
    }

    // Spawn initial gold and power-ups
    this.spawnInitialItems();

    // Set up event listeners
    this.gameInterface.on('joystick_move', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && !entity.isDead) {
        entity.dx = data.dx;
        entity.dy = data.dy;
        entity.state = (data.dx === 0 && data.dy === 0) ? 'idle' : 'walking';
        
        // Update direction based on movement
        if (data.dx !== 0 || data.dy !== 0) {
          entity.rotation = Math.atan2(data.dy, data.dx);
          entity.direction = data.dx > 0 ? 'right' : 'left';
        }
      }
    });

    this.gameInterface.on('aim', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && !entity.isDead) {
        entity.rotation = data.angle;
      }
    });

    this.gameInterface.on('shoot', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && !entity.isDead && !entity.isReloading && entity.ammo > 0 && entity.shootCooldown <= 0) {
        this.shootWeapon(entity);
      }
    });

    this.gameInterface.on('reload', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && !entity.isDead && !entity.isReloading && entity.ammo < entity.maxAmmo) {
        this.startReload(entity);
      }
    });

    this.gameInterface.on('change_weapon', (data) => {
      const entity = this.gameState.entities[data.userId];
      if (entity && !entity.isDead && !entity.isReloading) {
        this.changeWeapon(entity, data.weapon);
      }
    });
  }

  spawnInitialItems() {
    // Spawn initial gold
    for (let i = 0; i < 20; i++) {
      this.spawnGold();
    }
    
    // Spawn initial power-ups
    for (let i = 0; i < 5; i++) {
      this.spawnPowerUp();
    }
  }

  spawnGold() {
    const goldId = `gold_${this.gameState.nextGoldId++}`;
    this.gameState.gold[goldId] = {
      id: goldId,
      x: 100 + Math.random() * 1800,
      y: 100 + Math.random() * 1800,
      value: 5 + Math.floor(Math.random() * 10), // 5-14 gold
      type: 'gold'
    };
  }

  spawnPowerUp() {
    const powerUpId = `powerup_${this.gameState.nextPowerUpId++}`;
    const powerUpTypes = ['health', 'speed', 'quickReload'];
    const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    
    this.gameState.powerUps[powerUpId] = {
      id: powerUpId,
      x: 100 + Math.random() * 1800,
      y: 100 + Math.random() * 1800,
      type: type,
      duration: 10000 // 10 seconds
    };
  }

  shootWeapon(entity) {
    const weaponStats = this.weaponTypes[entity.currentWeapon];
    
    // Create bullet
    const bulletId = `bullet_${this.gameState.nextBulletId++}`;
    const spread = (Math.random() - 0.5) * weaponStats.spread;
    const angle = entity.rotation + spread;
    
    this.gameState.bullets[bulletId] = {
      id: bulletId,
      ownerId: entity.id,
      x: entity.x,
      y: entity.y,
      dx: Math.cos(angle) * weaponStats.bulletSpeed,
      dy: Math.sin(angle) * weaponStats.bulletSpeed,
      damage: weaponStats.damage,
      range: weaponStats.range,
      distanceTraveled: 0,
      type: entity.currentWeapon
    };
    
    // Special case for shotgun - fire multiple bullets
    if (entity.currentWeapon === 'shotgun') {
      for (let i = 0; i < 4; i++) {
        const spreadAngle = entity.rotation + (Math.random() - 0.5) * weaponStats.spread * 2;
        const extraBulletId = `bullet_${this.gameState.nextBulletId++}`;
        
        this.gameState.bullets[extraBulletId] = {
          id: extraBulletId,
          ownerId: entity.id,
          x: entity.x,
          y: entity.y,
          dx: Math.cos(spreadAngle) * weaponStats.bulletSpeed,
          dy: Math.sin(spreadAngle) * weaponStats.bulletSpeed,
          damage: weaponStats.damage / 2, // Less damage per pellet
          range: weaponStats.range * 0.8, // Slightly less range
          distanceTraveled: 0,
          type: entity.currentWeapon
        };
      }
    }
    
    // Special case for dynamite - slower but more damage
    if (entity.currentWeapon === 'dynamite') {
      this.gameState.bullets[bulletId].isExplosive = true;
      this.gameState.bullets[bulletId].explosionRadius = 100;
    }
    
    // Update entity state
    entity.ammo--;
    entity.shootCooldown = 500; // Base cooldown between shots
    entity.isShooting = true;
    entity.shootingTimer = 300; // Animation time
    
    // Auto-reload if out of ammo
    if (entity.ammo <= 0) {
      this.startReload(entity);
    }
  }

  startReload(entity) {
    const weaponStats = this.weaponTypes[entity.currentWeapon];
    entity.isReloading = true;
    
    // Apply quick reload power-up if active
    let reloadTime = weaponStats.reloadTime;
    if (entity.quickReload > 0) {
      reloadTime *= 0.5; // 50% faster reload
    }
    
    entity.reloadTimer = reloadTime;
  }

  finishReload(entity) {
    entity.isReloading = false;
    entity.ammo = this.weaponTypes[entity.currentWeapon].ammoCapacity;
  }

  changeWeapon(entity, weaponName) {
    if (this.weaponTypes[weaponName]) {
      entity.currentWeapon = weaponName;
      entity.ammo = this.weaponTypes[weaponName].ammoCapacity;
      entity.maxAmmo = this.weaponTypes[weaponName].ammoCapacity;
      entity.isReloading = false;
    }
  }

  applyPowerUp(entity, powerUp) {
    switch (powerUp.type) {
      case 'health':
        entity.health = Math.min(entity.health + 30, entity.maxHealth);
        break;
      case 'speed':
        entity.speedBoost = powerUp.duration;
        break;
      case 'quickReload':
        entity.quickReload = powerUp.duration;
        break;
    }
  }

  checkCollision(entity1, entity2, radius = 40) {
    const distance = Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    );
    return distance < radius;
  }

  updateBotAI(bot, deltaTime) {
    // Decrease decision timer
    bot.decisionTimer -= deltaTime;
    
    // Make new decisions when timer expires
    if (bot.decisionTimer <= 0) {
      bot.decisionTimer = 1000 + Math.random() * 2000; // 1-3 seconds
      
      // Find closest non-dead player
      let closestPlayer = null;
      let closestDistance = Infinity;
      
      Object.values(this.gameState.entities).forEach(entity => {
        if (entity.id !== bot.id && !entity.isDead) {
          const distance = Math.sqrt(
            Math.pow(bot.x - entity.x, 2) + 
            Math.pow(bot.y - entity.y, 2)
          );
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPlayer = entity;
          }
        }
      });
      
      // Set target
      if (closestPlayer) {
        bot.targetId = closestPlayer.id;
      }
      
      // Random movement
      bot.moveTimer = 500 + Math.random() * 1500;
      bot.dx = (Math.random() - 0.5) * 2;
      bot.dy = (Math.random() - 0.5) * 2;
      
      // Normalize movement vector
      const magnitude = Math.sqrt(bot.dx * bot.dx + bot.dy * bot.dy);
      if (magnitude > 0) {
        bot.dx /= magnitude;
        bot.dy /= magnitude;
      }
      
      bot.state = 'walking';
      bot.direction = bot.dx > 0 ? 'right' : 'left';
    }
    
    // Update movement timer
    bot.moveTimer -= deltaTime;
    if (bot.moveTimer <= 0) {
      bot.dx = 0;
      bot.dy = 0;
      bot.state = 'idle';
    }
    
    // If bot has a target, aim and shoot at them
    if (bot.targetId && this.gameState.entities[bot.targetId] && !this.gameState.entities[bot.targetId].isDead) {
      const target = this.gameState.entities[bot.targetId];
      const angleToTarget = Math.atan2(target.y - bot.y, target.x - bot.x);
      
      // Aim at target
      bot.rotation = angleToTarget;
      
      // Shoot if not reloading and has ammo
      if (!bot.isReloading && bot.ammo > 0 && bot.shootCooldown <= 0 && Math.random() < 0.05) {
        this.shootWeapon(bot);
      }
      
      // Reload if out of ammo
      if (bot.ammo <= 0 && !bot.isReloading) {
        this.startReload(bot);
      }
    }
    
    // Look for nearby power-ups and gold
    Object.values(this.gameState.powerUps).forEach(powerUp => {
      if (this.checkCollision(bot, powerUp, 100) && Math.random() < 0.5) {
        // Move towards power-up
        const angleToItem = Math.atan2(powerUp.y - bot.y, powerUp.x - bot.x);
        bot.dx = Math.cos(angleToItem);
        bot.dy = Math.sin(angleToItem);
        bot.state = 'walking';
        bot.direction = bot.dx > 0 ? 'right' : 'left';
      }
    });
  }

  getResults() {
    const alivePlayers = Object.values(this.gameState.entities)
      .filter(e => !e.isDead)
      .map(p => ({ name: p.name, gold: p.gold }))
      .sort((a, b) => b.gold - a.gold);
    
    const deadPlayers = Object.values(this.gameState.entities)
      .filter(e => e.isDead)
      .map(p => ({ name: p.name, gold: p.gold }))
      .sort((a, b) => b.gold - a.gold);
    
    return {
      winners: alivePlayers.map(p => p.name),
      losers: deadPlayers.map(p => p.name),
      goldLeaders: [...alivePlayers, ...deadPlayers].slice(0, 3).map(p => p.name)
    };
  }

  update(deltaTime) {
    if (this.isGameOver) return;

    // Update timer
    this.gameTimer -= deltaTime;
    this.gameState.timeRemaining = Math.max(0, this.gameTimer);
    
    // Update day/night cycle
    this.gameState.dayNightTimer -= deltaTime;
    if (this.gameState.dayNightTimer <= 0) {
      this.gameState.dayNightCycle = this.gameState.dayNightCycle === 'day' ? 'night' : 'day';
      this.gameState.dayNightTimer = 60000; // Reset timer
    }
    
    // Check for game over conditions
    const alivePlayers = Object.values(this.gameState.entities).filter(e => !e.isDead);
    if (this.gameTimer <= 0 || (alivePlayers.length <= 1 && Object.values(this.gameState.entities).length > 1)) {
      this.isGameOver = true;
      this.gameState.isGameOver = true;
      this.gameState.results = this.getResults();
      return;
    }

    // Update power-up and gold spawn timers
    this.spawnPowerUpTimer -= deltaTime;
    this.spawnGoldTimer -= deltaTime;
    
    if (this.spawnPowerUpTimer <= 0) {
      this.spawnPowerUp();
      this.spawnPowerUpTimer = 15000 + Math.random() * 10000; // 15-25 seconds
    }
    
    if (this.spawnGoldTimer <= 0) {
      this.spawnGold();
      this.spawnGoldTimer = 5000 + Math.random() * 5000; // 5-10 seconds
    }

    // Update entities
    Object.values(this.gameState.entities).forEach(entity => {
      if (entity.isDead) return;
      
      // Update bot AI
      if (entity.isBot) {
        this.updateBotAI(entity, deltaTime);
      }
      
      // Update position
      let effectiveSpeed = entity.speed;
      if (entity.speedBoost > 0) {
        effectiveSpeed *= 1.5; // 50% speed boost
        entity.speedBoost -= deltaTime;
      }
      
      entity.x += entity.dx * deltaTime * effectiveSpeed;
      entity.y += entity.dy * deltaTime * effectiveSpeed;
      
      // Constrain to world bounds
      entity.x = Math.max(50, Math.min(entity.x, this.gameState.worldSize.width - 50));
      entity.y = Math.max(50, Math.min(entity.y, this.gameState.worldSize.height - 50));
      
      // Update reload timer
      if (entity.isReloading) {
        entity.reloadTimer -= deltaTime;
        if (entity.reloadTimer <= 0) {
          this.finishReload(entity);
        }
      }
      
      // Update shoot cooldown
      if (entity.shootCooldown > 0) {
        entity.shootCooldown -= deltaTime;
      }
      
      // Update shooting animation
      if (entity.isShooting) {
        entity.shootingTimer -= deltaTime;
        if (entity.shootingTimer <= 0) {
          entity.isShooting = false;
        }
      }
      
      // Update quick reload timer
      if (entity.quickReload > 0) {
        entity.quickReload -= deltaTime;
      }
      
      // Check for power-up collisions
      Object.keys(this.gameState.powerUps).forEach(powerUpId => {
        const powerUp = this.gameState.powerUps[powerUpId];
        if (this.checkCollision(entity, powerUp)) {
          this.applyPowerUp(entity, powerUp);
          delete this.gameState.powerUps[powerUpId];
        }
      });
      
      // Check for gold collisions
      Object.keys(this.gameState.gold).forEach(goldId => {
        const gold = this.gameState.gold[goldId];
        if (this.checkCollision(entity, gold)) {
          entity.gold += gold.value;
          delete this.gameState.gold[goldId];
        }
      });
    });

    // Update bullets
    Object.keys(this.gameState.bullets).forEach(bulletId => {
      const bullet = this.gameState.bullets[bulletId];
      
      // Update position
      bullet.x += bullet.dx * deltaTime;
      bullet.y += bullet.dy * deltaTime;
      
      // Update distance traveled
      const distanceThisFrame = Math.sqrt(
        Math.pow(bullet.dx * deltaTime, 2) + 
        Math.pow(bullet.dy * deltaTime, 2)
      );
      bullet.distanceTraveled += distanceThisFrame;
      
      // Check if bullet has exceeded its range
      if (bullet.distanceTraveled >= bullet.range) {
        // Handle dynamite explosion
        if (bullet.isExplosive) {
          this.createExplosion(bullet);
        }
        delete this.gameState.bullets[bulletId];
        return;
      }
      
      // Check for collisions with entities
      Object.values(this.gameState.entities).forEach(entity => {
        if (entity.id !== bullet.ownerId && !entity.isDead && this.checkCollision(bullet, entity, 25)) {
          // Apply damage
          entity.health -= bullet.damage;
          
          // Check if entity is dead
          if (entity.health <= 0) {
            entity.isDead = true;
            entity.health = 0;
            entity.state = 'dead';
          }
          
          // Handle dynamite explosion
          if (bullet.isExplosive) {
            this.createExplosion(bullet);
          }
          
          // Remove bullet
          delete this.gameState.bullets[bulletId];
        }
      });
      
      // Check if bullet is out of bounds
      if (bullet.x < 0 || bullet.x > this.gameState.worldSize.width || 
          bullet.y < 0 || bullet.y > this.gameState.worldSize.height) {
        delete this.gameState.bullets[bulletId];
      }
    });
  }

  createExplosion(bullet) {
    // Damage all entities within explosion radius
    Object.values(this.gameState.entities).forEach(entity => {
      if (!entity.isDead) {
        const distance = Math.sqrt(
          Math.pow(entity.x - bullet.x, 2) + 
          Math.pow(entity.y - bullet.y, 2)
        );
        
        if (distance < bullet.explosionRadius) {
          // Calculate damage based on distance (more damage closer to center)
          const damageMultiplier = 1 - (distance / bullet.explosionRadius);
          const explosionDamage = bullet.damage * damageMultiplier;
          
          entity.health -= explosionDamage;
          
          // Check if entity is dead
          if (entity.health <= 0) {
            entity.isDead = true;
            entity.health = 0;
            entity.state = 'dead';
          }
        }
      }
    });
  }
}

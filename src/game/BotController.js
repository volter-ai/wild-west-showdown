class BotController {
  constructor(gameInterface, botId, gameState) {
    this.gameInterface = gameInterface;
    this.botId = botId;
    this.gameState = gameState;
    this.updateInterval = setInterval(() => this.update(), 100);
    
    // Bot personality traits (randomized to make each bot unique)
    this.personality = {
      aggressiveness: 0.3 + Math.random() * 0.7, // 0.3-1.0
      cautiousness: 0.2 + Math.random() * 0.6,   // 0.2-0.8
      greediness: 0.3 + Math.random() * 0.7,     // 0.3-1.0
      wanderlust: 0.2 + Math.random() * 0.8      // 0.2-1.0
    };
    
    // Bot state
    this.state = {
      currentTarget: null,
      targetType: null, // 'player', 'powerup', 'gold', null
      lastDecisionTime: 0,
      decisionInterval: 500 + Math.random() * 1000, // 0.5-1.5 seconds
      lastShootTime: 0,
      lastReloadTime: 0,
      lastWeaponSwitchTime: 0,
      movementDirection: { dx: 0, dy: 0 },
      patrolPoint: null,
      avoidanceVector: { dx: 0, dy: 0 },
      stuckCheckPosition: null,
      stuckCheckTime: 0
    };
  }

  update() {
    const currentTime = performance.now();
    const bot = this.getBot();
    
    // Skip if bot doesn't exist or is dead
    if (!bot || bot.isDead) return;
    
    // Make decisions at intervals to simulate human reaction time
    if (currentTime - this.state.lastDecisionTime > this.state.decisionInterval) {
      this.makeDecisions(currentTime);
      this.state.lastDecisionTime = currentTime;
      this.state.decisionInterval = 500 + Math.random() * 1000; // Vary decision time
    }
    
    // Always update movement based on current state
    this.updateMovement();
    
    // Check if bot is stuck
    this.checkIfStuck(currentTime, bot);
  }

  getBot() {
    return this.gameState.entities[this.botId];
  }

  makeDecisions(currentTime) {
    const bot = this.getBot();
    if (!bot) return;
    
    // Assess situation
    const healthPercentage = bot.health / bot.maxHealth;
    const isLowHealth = healthPercentage < 0.4;
    const isLowAmmo = bot.ammo <= 1;
    const isReloading = bot.isReloading;
    
    // Decide what to do based on health, ammo, and personality
    if (isLowHealth && Math.random() < this.personality.cautiousness) {
      // When low health, prioritize finding health power-ups
      this.findNearestPowerUp('health');
    } else if (isLowAmmo && !isReloading && Math.random() < 0.7) {
      // Reload when low on ammo
      this.reload();
    } else {
      // Normal behavior - balance between attacking, collecting items
      const shouldAttack = Math.random() < this.personality.aggressiveness;
      const shouldCollectGold = Math.random() < this.personality.greediness;
      
      if (shouldAttack) {
        this.findAndTargetPlayer();
      } else if (shouldCollectGold) {
        this.findNearestGold();
      } else {
        // Sometimes look for power-ups
        const powerUpTypes = ['health', 'speed', 'quickReload'];
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        this.findNearestPowerUp(randomType);
      }
    }
    
    // Weapon selection based on target distance
    this.selectAppropriateWeapon();
    
    // Shooting logic
    this.handleShooting(currentTime);
  }

  findAndTargetPlayer() {
    const bot = this.getBot();
    if (!bot) return;
    
    // Find all non-dead players that aren't this bot
    const potentialTargets = Object.values(this.gameState.entities).filter(entity => 
      entity.id !== this.botId && !entity.isDead
    );
    
    if (potentialTargets.length === 0) {
      this.patrol();
      return;
    }
    
    // Calculate distances to all potential targets
    const targetsWithDistance = potentialTargets.map(target => {
      const distance = this.getDistance(bot, target);
      return { target, distance };
    });
    
    // Sort by distance
    targetsWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Avoid targeting other bots if there are real players
    // This helps prevent bot clustering
    const realPlayers = targetsWithDistance.filter(t => !t.target.isBot);
    
    if (realPlayers.length > 0 && Math.random() < 0.8) {
      // 80% chance to target real players if available
      const randomIndex = Math.floor(Math.random() * Math.min(2, realPlayers.length));
      this.state.currentTarget = realPlayers[randomIndex].target;
    } else {
      // Otherwise, target any player with some randomness
      // Don't always pick the closest to seem more human-like
      const randomIndex = Math.floor(Math.random() * Math.min(3, targetsWithDistance.length));
      this.state.currentTarget = targetsWithDistance[randomIndex].target;
    }
    
    this.state.targetType = 'player';
  }

  findNearestPowerUp(preferredType = null) {
    const bot = this.getBot();
    if (!bot) return;
    
    const powerUps = Object.values(this.gameState.powerUps);
    if (powerUps.length === 0) {
      this.patrol();
      return;
    }
    
    // Calculate distances to all power-ups
    const powerUpsWithDistance = powerUps.map(powerUp => {
      const distance = this.getDistance(bot, powerUp);
      return { powerUp, distance };
    });
    
    // Sort by distance
    powerUpsWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Prefer the specified type if available
    if (preferredType) {
      const preferredPowerUps = powerUpsWithDistance.filter(p => p.powerUp.type === preferredType);
      if (preferredPowerUps.length > 0) {
        this.state.currentTarget = preferredPowerUps[0].powerUp;
        this.state.targetType = 'powerup';
        return;
      }
    }
    
    // Otherwise pick the closest
    if (powerUpsWithDistance.length > 0) {
      this.state.currentTarget = powerUpsWithDistance[0].powerUp;
      this.state.targetType = 'powerup';
    } else {
      this.patrol();
    }
  }

  findNearestGold() {
    const bot = this.getBot();
    if (!bot) return;
    
    const goldItems = Object.values(this.gameState.gold);
    if (goldItems.length === 0) {
      this.patrol();
      return;
    }
    
    // Calculate distances to all gold
    const goldWithDistance = goldItems.map(gold => {
      const distance = this.getDistance(bot, gold);
      return { gold, distance };
    });
    
    // Sort by distance
    goldWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Pick the closest gold with some randomness
    const randomIndex = Math.floor(Math.random() * Math.min(3, goldWithDistance.length));
    this.state.currentTarget = goldWithDistance[randomIndex].gold;
    this.state.targetType = 'gold';
  }

  patrol() {
    const bot = this.getBot();
    if (!bot) return;
    
    // If we don't have a patrol point or we're close to it, pick a new one
    if (!this.state.patrolPoint || this.getDistance(bot, this.state.patrolPoint) < 50) {
      // Pick a random point in the world, but not too close to the edges
      const margin = 200;
      this.state.patrolPoint = {
        x: margin + Math.random() * (this.gameState.worldSize.width - 2 * margin),
        y: margin + Math.random() * (this.gameState.worldSize.height - 2 * margin)
      };
    }
    
    this.state.currentTarget = this.state.patrolPoint;
    this.state.targetType = 'patrol';
  }

  updateMovement() {
    const bot = this.getBot();
    if (!bot || !this.state.currentTarget) return;
    
    // Calculate direction to target
    let dx = this.state.currentTarget.x - bot.x;
    let dy = this.state.currentTarget.y - bot.y;
    
    // Normalize direction
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > 0) {
      dx /= magnitude;
      dy /= magnitude;
    }
    
    // Add some randomness to movement to make it more human-like
    const randomFactor = 0.2;
    dx += (Math.random() - 0.5) * randomFactor;
    dy += (Math.random() - 0.5) * randomFactor;
    
    // Normalize again after adding randomness
    const newMagnitude = Math.sqrt(dx * dx + dy * dy);
    if (newMagnitude > 0) {
      dx /= newMagnitude;
      dy /= newMagnitude;
    }
    
    // If targeting a player and close enough, sometimes circle around instead of direct approach
    if (this.state.targetType === 'player') {
      const distance = this.getDistance(bot, this.state.currentTarget);
      if (distance < 300 && Math.random() < 0.4) {
        // Create a perpendicular vector for circling
        const perpDx = -dy;
        const perpDy = dx;
        
        // Mix in some circling behavior
        dx = dx * 0.5 + perpDx * 0.5;
        dy = dy * 0.5 + perpDy * 0.5;
        
        // Normalize again
        const circlingMagnitude = Math.sqrt(dx * dx + dy * dy);
        if (circlingMagnitude > 0) {
          dx /= circlingMagnitude;
          dy /= circlingMagnitude;
        }
      }
    }
    
    // Add avoidance vector to prevent clustering with other bots
    dx += this.state.avoidanceVector.dx;
    dy += this.state.avoidanceVector.dy;
    
    // Final normalization
    const finalMagnitude = Math.sqrt(dx * dx + dy * dy);
    if (finalMagnitude > 0) {
      dx /= finalMagnitude;
      dy /= finalMagnitude;
    }
    
    // Update bot's movement direction
    this.state.movementDirection = { dx, dy };
    
    // Send movement command
    this.gameInterface.sendGameEvent('joystick_move', {
      userId: this.botId,
      dx: dx,
      dy: dy
    });
    
    // Update bot's aim to point at the target
    if (this.state.targetType === 'player') {
      const angle = Math.atan2(dy, dx);
      this.gameInterface.sendGameEvent('aim', {
        userId: this.botId,
        angle: angle
      });
    }
    
    // Calculate avoidance vector to prevent bot clustering
    this.calculateAvoidanceVector(bot);
  }

  calculateAvoidanceVector(bot) {
    // Find nearby bots
    const nearbyBots = Object.values(this.gameState.entities).filter(entity => 
      entity.id !== this.botId && entity.isBot && !entity.isDead && this.getDistance(bot, entity) < 150
    );
    
    // Reset avoidance vector
    this.state.avoidanceVector = { dx: 0, dy: 0 };
    
    // If no nearby bots, no need for avoidance
    if (nearbyBots.length === 0) return;
    
    // Calculate avoidance vector (move away from other bots)
    nearbyBots.forEach(otherBot => {
      const distance = this.getDistance(bot, otherBot);
      if (distance < 1) return; // Avoid division by zero
      
      // Stronger avoidance for closer bots
      const avoidStrength = 100 / distance;
      
      // Direction away from other bot
      const dx = (bot.x - otherBot.x) / distance * avoidStrength;
      const dy = (bot.y - otherBot.y) / distance * avoidStrength;
      
      // Add to avoidance vector
      this.state.avoidanceVector.dx += dx;
      this.state.avoidanceVector.dy += dy;
    });
    
    // Normalize avoidance vector
    const magnitude = Math.sqrt(
      this.state.avoidanceVector.dx * this.state.avoidanceVector.dx + 
      this.state.avoidanceVector.dy * this.state.avoidanceVector.dy
    );
    
    if (magnitude > 0) {
      this.state.avoidanceVector.dx /= magnitude;
      this.state.avoidanceVector.dy /= magnitude;
      
      // Scale down avoidance effect
      this.state.avoidanceVector.dx *= 0.3;
      this.state.avoidanceVector.dy *= 0.3;
    }
  }

  handleShooting(currentTime) {
    const bot = this.getBot();
    if (!bot || bot.isDead || bot.isReloading) return;
    
    // Only shoot at players
    if (this.state.targetType !== 'player' || !this.state.currentTarget) return;
    
    const target = this.state.currentTarget;
    const distance = this.getDistance(bot, target);
    
    // Get weapon range
    const weaponStats = this.getWeaponStats(bot.currentWeapon);
    if (!weaponStats) return;
    
    // Only shoot if target is in range
    if (distance <= weaponStats.range) {
      // Add some delay between shots to seem more human
      const minShootInterval = 300 + Math.random() * 500; // 300-800ms
      
      if (currentTime - this.state.lastShootTime > minShootInterval && bot.ammo > 0) {
        this.gameInterface.sendGameEvent('shoot', { userId: this.botId });
        this.state.lastShootTime = currentTime;
      }
    }
    
    // Reload if low on ammo and not in immediate danger
    if (bot.ammo <= 1 && distance > 200 && currentTime - this.state.lastReloadTime > 5000) {
      this.reload();
      this.state.lastReloadTime = currentTime;
    }
  }

  reload() {
    const bot = this.getBot();
    if (!bot || bot.isDead || bot.isReloading || bot.ammo >= bot.maxAmmo) return;
    
    this.gameInterface.sendGameEvent('reload', { userId: this.botId });
  }

  selectAppropriateWeapon() {
    const bot = this.getBot();
    if (!bot || bot.isDead || bot.isReloading) return;
    
    // Don't switch weapons too frequently
    const currentTime = performance.now();
    if (currentTime - this.state.lastWeaponSwitchTime < 3000) return;
    
    // Only switch weapons if we have a player target
    if (this.state.targetType !== 'player' || !this.state.currentTarget) return;
    
    const distance = this.getDistance(bot, this.state.currentTarget);
    let bestWeapon = bot.currentWeapon;
    
    // Simple weapon selection based on distance
    if (distance < 200) {
      // Close range - prefer shotgun or dynamite
      bestWeapon = Math.random() < 0.7 ? 'shotgun' : 'dynamite';
    } else if (distance < 400) {
      // Medium range - prefer revolver
      bestWeapon = 'revolver';
    } else {
      // Long range - prefer rifle
      bestWeapon = 'rifle';
    }
    
    // Only switch if it's different
    if (bestWeapon !== bot.currentWeapon) {
      this.gameInterface.sendGameEvent('change_weapon', {
        userId: this.botId,
        weapon: bestWeapon
      });
      this.state.lastWeaponSwitchTime = currentTime;
    }
  }

  getWeaponStats(weaponName) {
    const weaponStats = {
      revolver: { damage: 25, range: 300, reloadTime: 1000, ammoCapacity: 6, bulletSpeed: 0.5, spread: 0.1 },
      shotgun: { damage: 40, range: 200, reloadTime: 1500, ammoCapacity: 2, bulletSpeed: 0.4, spread: 0.3 },
      rifle: { damage: 35, range: 500, reloadTime: 2000, ammoCapacity: 4, bulletSpeed: 0.6, spread: 0.05 },
      dynamite: { damage: 75, range: 150, reloadTime: 3000, ammoCapacity: 1, bulletSpeed: 0.3, spread: 0 }
    };
    
    return weaponStats[weaponName];
  }

  getDistance(entity1, entity2) {
    return Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    );
  }

  checkIfStuck(currentTime, bot) {
    // Check if bot is stuck every 2 seconds
    if (currentTime - this.state.stuckCheckTime > 2000) {
      if (this.state.stuckCheckPosition) {
        // If position hasn't changed much, bot might be stuck
        const distance = this.getDistance(bot, this.state.stuckCheckPosition);
        if (distance < 20) {
          // Bot is likely stuck, choose a new random direction
          const randomAngle = Math.random() * Math.PI * 2;
          const dx = Math.cos(randomAngle);
          const dy = Math.sin(randomAngle);
          
          this.gameInterface.sendGameEvent('joystick_move', {
            userId: this.botId,
            dx: dx,
            dy: dy
          });
          
          // Also pick a new patrol point
          this.patrol();
        }
      }
      
      // Update position for next check
      this.state.stuckCheckPosition = { x: bot.x, y: bot.y };
      this.state.stuckCheckTime = currentTime;
    }
  }

  destroy() {
    clearInterval(this.updateInterval);
  }
}

export default BotController;

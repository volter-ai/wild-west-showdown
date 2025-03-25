class BotController {
  constructor(gameInterface, botId, gameState) {
    this.gameInterface = gameInterface;
    this.botId = botId;
    this.gameState = gameState;
    
    // Bot personality traits (seeded by botId)
    const botSeed = this.hashString(botId);
    this.personality = {
      aggression: 0.3 + (botSeed % 7) / 10, // 0.3-0.9 range
      caution: 0.2 + (botSeed % 5) / 10,    // 0.2-0.7 range
      greed: 0.4 + (botSeed % 6) / 10,      // 0.4-0.9 range
      reaction: 100 + (botSeed % 150)       // 100-250ms reaction time
    };
    
    // Bot state
    this.state = {
      currentTarget: null,
      targetType: null, // 'player', 'collectible', 'none'
      lastDecisionTime: 0,
      lastActionTime: 0,
      lastShotTime: 0,
      lastReloadTime: 0,
      lastAbilityTime: 0,
      wanderDirection: { dx: 0, dy: 0 },
      wanderChangeTime: 0,
      avoidingHazard: false,
      fleeingFrom: null,
      combatDistance: 200 + (botSeed % 150) // Preferred combat distance
    };
    
    // Action cooldowns
    this.cooldowns = {
      decision: 500 + (botSeed % 300),      // How often to reconsider targets
      movement: 100 + (botSeed % 50),       // How often to update movement
      shooting: 200 + (botSeed % 100),      // Min time between shots
      reload: 1000 + (botSeed % 500),       // Min time between reload attempts
      ability: 5000 + (botSeed % 5000),     // Min time between ability uses
      wanderChange: 1000 + (botSeed % 1000) // How often to change wander direction
    };
    
    this.updateInterval = setInterval(() => this.update(), 100);
  }

  // Simple string hash function to generate consistent random values from botId
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  update() {
    const now = Date.now();
    const bot = this.getBotEntity();
    
    // Skip if bot doesn't exist or is dead
    if (!bot || !bot.alive) return;
    
    // Skip if bot is stunned
    if (bot.stunned && bot.stunnedUntil > now) return;
    
    // Make decisions at a human-like rate
    if (now - this.state.lastDecisionTime > this.cooldowns.decision) {
      this.makeDecisions(now, bot);
      this.state.lastDecisionTime = now;
    }
    
    // Update movement at a more frequent rate
    if (now - this.state.lastActionTime > this.cooldowns.movement) {
      this.updateMovement(now, bot);
      this.state.lastActionTime = now;
    }
    
    // Handle combat actions
    this.handleCombat(now, bot);
    
    // Handle special ability usage
    this.handleSpecialAbility(now, bot);
  }
  
  getBotEntity() {
    return this.gameState.entities[this.botId];
  }
  
  makeDecisions(now, bot) {
    // Assess situation and decide what to do
    
    // Check if we need to reload
    if (bot.ammo === 0 && !bot.reloading && now - this.state.lastReloadTime > this.cooldowns.reload) {
      this.gameInterface.sendGameEvent('reload', { userId: this.botId });
      this.state.lastReloadTime = now;
      return;
    }
    
    // Check if we're in danger (low health)
    const isLowHealth = bot.health < bot.maxHealth * 0.3;
    
    // Find nearest health pickup if low on health
    if (isLowHealth && Math.random() < this.personality.caution) {
      const healthPickup = this.findNearestCollectible(bot, 'powerUp', 'extraHealth');
      if (healthPickup) {
        this.state.currentTarget = healthPickup;
        this.state.targetType = 'collectible';
        return;
      }
    }
    
    // Find nearest threat
    const nearestThreat = this.findNearestThreat(bot);
    
    // If we're low on health and there's a nearby threat, consider fleeing
    if (isLowHealth && nearestThreat && this.getDistance(bot, nearestThreat) < 300 && 
        Math.random() < this.personality.caution) {
      this.state.fleeingFrom = nearestThreat;
      this.state.targetType = 'flee';
      return;
    }
    
    // Check for nearby hazards to avoid
    const nearbyHazard = this.findNearbyHazard(bot);
    if (nearbyHazard) {
      this.state.avoidingHazard = true;
      return;
    } else {
      this.state.avoidingHazard = false;
    }
    
    // Decide what to target based on personality and situation
    
    // Aggressive bots prefer targeting players
    if (Math.random() < this.personality.aggression && nearestThreat && 
        this.getDistance(bot, nearestThreat) < 500) {
      this.state.currentTarget = nearestThreat;
      this.state.targetType = 'player';
      this.state.fleeingFrom = null;
      return;
    }
    
    // Greedy bots prefer targeting valuable collectibles
    if (Math.random() < this.personality.greed) {
      // Try to find a better weapon first
      if (bot.weapon === 'revolver') {
        const betterWeapon = this.findNearestCollectible(bot, 'weapon');
        if (betterWeapon && this.getDistance(bot, betterWeapon) < 400) {
          this.state.currentTarget = betterWeapon;
          this.state.targetType = 'collectible';
          this.state.fleeingFrom = null;
          return;
        }
      }
      
      // Then look for gold or power-ups
      const valuableCollectible = this.findNearestCollectible(bot);
      if (valuableCollectible && this.getDistance(bot, valuableCollectible) < 300) {
        this.state.currentTarget = valuableCollectible;
        this.state.targetType = 'collectible';
        this.state.fleeingFrom = null;
        return;
      }
    }
    
    // Default: if we have no specific target, but there's a threat in range, target it
    if (nearestThreat && this.getDistance(bot, nearestThreat) < 400) {
      this.state.currentTarget = nearestThreat;
      this.state.targetType = 'player';
      this.state.fleeingFrom = null;
      return;
    }
    
    // If no specific target, wander and look for collectibles
    if (now - this.state.wanderChangeTime > this.cooldowns.wanderChange) {
      this.state.wanderDirection = {
        dx: (Math.random() * 2 - 1),
        dy: (Math.random() * 2 - 1)
      };
      this.state.wanderChangeTime = now;
      this.state.targetType = 'none';
      this.state.currentTarget = null;
      this.state.fleeingFrom = null;
    }
  }
  
  updateMovement(now, bot) {
    let dx = 0;
    let dy = 0;
    
    // Handle different movement types based on current target
    if (this.state.avoidingHazard) {
      // Move away from hazard
      const hazard = this.findNearbyHazard(bot);
      if (hazard) {
        const directionVector = this.getAvoidanceVector(bot, hazard);
        dx = directionVector.dx;
        dy = directionVector.dy;
      } else {
        this.state.avoidingHazard = false;
      }
    } else if (this.state.targetType === 'flee') {
      // Run away from threat
      if (this.state.fleeingFrom) {
        const fleeVector = this.getFleeingVector(bot, this.state.fleeingFrom);
        dx = fleeVector.dx;
        dy = fleeVector.dy;
      }
    } else if (this.state.targetType === 'player') {
      // Move toward player target, but maintain optimal combat distance
      if (this.state.currentTarget && this.state.currentTarget.alive) {
        const distance = this.getDistance(bot, this.state.currentTarget);
        const directionVector = this.getDirectionVector(bot, this.state.currentTarget);
        
        if (distance > this.state.combatDistance) {
          // Move closer
          dx = directionVector.dx;
          dy = directionVector.dy;
        } else if (distance < this.state.combatDistance * 0.7) {
          // Back up a bit
          dx = -directionVector.dx;
          dy = -directionVector.dy;
        } else {
          // Strafe randomly to avoid being an easy target
          const strafeAngle = Math.PI/2 * (Math.random() > 0.5 ? 1 : -1);
          dx = Math.cos(Math.atan2(directionVector.dy, directionVector.dx) + strafeAngle);
          dy = Math.sin(Math.atan2(directionVector.dy, directionVector.dx) + strafeAngle);
        }
      }
    } else if (this.state.targetType === 'collectible') {
      // Move directly toward collectible
      if (this.state.currentTarget) {
        const directionVector = this.getDirectionVector(bot, this.state.currentTarget);
        dx = directionVector.dx;
        dy = directionVector.dy;
      }
    } else {
      // Wander randomly
      dx = this.state.wanderDirection.dx;
      dy = this.state.wanderDirection.dy;
    }
    
    // Avoid other bots - add a small repulsion vector
    const avoidanceVector = this.getBotsAvoidanceVector(bot);
    dx += avoidanceVector.dx * 0.3;
    dy += avoidanceVector.dy * 0.3;
    
    // Normalize the movement vector
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > 0) {
      dx = dx / magnitude;
      dy = dy / magnitude;
    }
    
    // Send movement command
    this.gameInterface.sendGameEvent('joystick_move', {
      userId: this.botId,
      dx: dx,
      dy: dy
    });
  }
  
  handleCombat(now, bot) {
    // Only engage in combat if we have a player target
    if (this.state.targetType !== 'player' || !this.state.currentTarget || !this.state.currentTarget.alive) {
      return;
    }
    
    const target = this.state.currentTarget;
    const distance = this.getDistance(bot, target);
    
    // Check if target is in range for our weapon
    const weaponRange = this.getWeaponRange(bot.weapon);
    
    if (distance <= weaponRange && !bot.reloading && bot.ammo > 0 && 
        now - this.state.lastShotTime > this.cooldowns.shooting) {
      
      // Calculate angle to target with some inaccuracy based on distance
      const inaccuracy = (distance / weaponRange) * 0.2 * (Math.random() - 0.5);
      const angle = Math.atan2(target.y - bot.y, target.x - bot.x) + inaccuracy;
      
      // Shoot
      this.gameInterface.sendGameEvent('shoot', {
        userId: this.botId,
        angle: angle
      });
      
      this.state.lastShotTime = now;
    }
    
    // Reload if we're low on ammo and not in immediate danger
    if (bot.ammo <= 1 && !bot.reloading && distance > weaponRange * 0.7 && 
        now - this.state.lastReloadTime > this.cooldowns.reload) {
      this.gameInterface.sendGameEvent('reload', { userId: this.botId });
      this.state.lastReloadTime = now;
    }
    
    // Switch weapons based on distance if we have better options
    if (bot.weapon === 'revolver' && distance < 150) {
      this.gameInterface.sendGameEvent('switch_weapon', {
        userId: this.botId,
        weapon: 'shotgun'
      });
    } else if (bot.weapon === 'shotgun' && distance > 200) {
      this.gameInterface.sendGameEvent('switch_weapon', {
        userId: this.botId,
        weapon: 'rifle'
      });
    }
  }
  
  handleSpecialAbility(now, bot) {
    // Use special abilities strategically
    if (now - this.state.lastAbilityTime < this.cooldowns.ability) {
      return;
    }
    
    let shouldUseAbility = false;
    
    switch (bot.characterType) {
      case 'Sheriff':
        // Use stun when enemies are nearby
        const nearbyEnemies = this.countNearbyEnemies(bot, 200);
        if (nearbyEnemies >= 1) {
          shouldUseAbility = true;
        }
        break;
        
      case 'Outlaw':
        // Use dual wield when in combat
        if (this.state.targetType === 'player' && 
            this.state.currentTarget && 
            this.getDistance(bot, this.state.currentTarget) < 300) {
          shouldUseAbility = true;
        }
        break;
        
      case 'BountyHunter':
        // Use tracking when we don't have a target or periodically
        if (!this.state.currentTarget || Math.random() < 0.3) {
          shouldUseAbility = true;
        }
        break;
    }
    
    if (shouldUseAbility) {
      this.gameInterface.sendGameEvent('use_ability', { userId: this.botId });
      this.state.lastAbilityTime = now;
    }
  }
  
  // Helper methods
  
  findNearestThreat(bot) {
    let nearestThreat = null;
    let nearestDistance = Infinity;
    
    Object.values(this.gameState.entities).forEach(entity => {
      if (entity.id !== this.botId && entity.alive) {
        const distance = this.getDistance(bot, entity);
        
        // Prioritize non-bot players slightly
        const distanceModifier = entity.isBot ? 1.2 : 1;
        
        if (distance * distanceModifier < nearestDistance) {
          nearestDistance = distance * distanceModifier;
          nearestThreat = entity;
        }
      }
    });
    
    return nearestThreat;
  }
  
  findNearestCollectible(bot, type = null, subType = null) {
    let nearestCollectible = null;
    let nearestDistance = Infinity;
    
    Object.values(this.gameState.collectibles).forEach(collectible => {
      // Filter by type if specified
      if (type && collectible.type !== type) return;
      
      // Filter by subType if specified (for powerUps or weapons)
      if (subType) {
        if (collectible.type === 'powerUp' && collectible.powerUpType !== subType) return;
        if (collectible.type === 'weapon' && collectible.weaponType !== subType) return;
      }
      
      const distance = this.getDistance(bot, collectible);
      
      // Apply value modifiers based on collectible type
      let valueModifier = 1;
      
      if (collectible.type === 'gold') {
        valueModifier = 0.8 + (collectible.value / 15); // Higher value gold is more attractive
      } else if (collectible.type === 'weapon') {
        // Prefer better weapons
        if (collectible.weaponType === 'shotgun') valueModifier = 0.9;
        else if (collectible.weaponType === 'rifle') valueModifier = 0.8;
        else if (collectible.weaponType === 'dynamite') valueModifier = 0.7;
      } else if (collectible.type === 'powerUp') {
        if (collectible.powerUpType === 'extraHealth') {
          // Make health more attractive when low on health
          valueModifier = 0.5 + (1 - (bot.health / bot.maxHealth));
        } else {
          valueModifier = 0.8;
        }
      }
      
      const adjustedDistance = distance * valueModifier;
      
      if (adjustedDistance < nearestDistance) {
        nearestDistance = adjustedDistance;
        nearestCollectible = collectible;
      }
    });
    
    return nearestCollectible;
  }
  
  findNearbyHazard(bot) {
    // Check for active hazards near the bot
    for (const hazardId in this.gameState.hazards) {
      const hazard = this.gameState.hazards[hazardId];
      
      if (!hazard.active) continue;
      
      if (hazard.type === 'cattle' || hazard.type === 'minecart') {
        // For moving hazards, check if bot is in their path
        if (hazard.direction === 'horizontal') {
          if (Math.abs(bot.y - hazard.position) < 60 && 
              bot.x > hazard.x && 
              bot.x < hazard.x + 300) {
            return hazard;
          }
        } else { // vertical
          if (Math.abs(bot.x - hazard.position) < 60 && 
              bot.y > hazard.y && 
              bot.y < hazard.y + 300) {
            return hazard;
          }
        }
      } else if (hazard.type === 'saloon') {
        // For area hazards, check if bot is inside
        if (this.getDistance(bot, hazard) < hazard.radius) {
          return hazard;
        }
      }
    }
    
    return null;
  }
  
  getDistance(entity1, entity2) {
    return Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    );
  }
  
  getDirectionVector(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    
    if (magnitude === 0) return { dx: 0, dy: 0 };
    
    return {
      dx: dx / magnitude,
      dy: dy / magnitude
    };
  }
  
  getFleeingVector(bot, threat) {
    // Get vector pointing away from threat
    const dx = bot.x - threat.x;
    const dy = bot.y - threat.y;
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    
    if (magnitude === 0) return { dx: Math.random() - 0.5, dy: Math.random() - 0.5 };
    
    return {
      dx: dx / magnitude,
      dy: dy / magnitude
    };
  }
  
  getAvoidanceVector(bot, hazard) {
    if (hazard.type === 'cattle' || hazard.type === 'minecart') {
      // For moving hazards, move perpendicular to their direction
      if (hazard.direction === 'horizontal') {
        // Move up or down away from the hazard
        return { 
          dx: 0, 
          dy: (bot.y > hazard.position) ? 1 : -1 
        };
      } else {
        // Move left or right away from the hazard
        return { 
          dx: (bot.x > hazard.position) ? 1 : -1, 
          dy: 0 
        };
      }
    } else if (hazard.type === 'saloon') {
      // Move directly away from the center of the saloon
      return this.getFleeingVector(bot, hazard);
    }
    
    return { dx: 0, dy: 0 };
  }
  
  getBotsAvoidanceVector(bot) {
    let avoidanceVector = { dx: 0, dy: 0 };
    
    Object.values(this.gameState.entities).forEach(entity => {
      if (entity.id !== this.botId && entity.alive) {
        const distance = this.getDistance(bot, entity);
        
        // Only avoid if very close
        if (distance < 80) {
          const repulsionStrength = 1 - (distance / 80);
          const directionVector = this.getDirectionVector(entity, bot);
          
          avoidanceVector.dx += directionVector.dx * repulsionStrength;
          avoidanceVector.dy += directionVector.dy * repulsionStrength;
        }
      }
    });
    
    return avoidanceVector;
  }
  
  getWeaponRange(weaponType) {
    switch (weaponType) {
      case 'revolver': return 300;
      case 'shotgun': return 150;
      case 'rifle': return 500;
      case 'dynamite': return 100;
      default: return 300;
    }
  }
  
  countNearbyEnemies(bot, radius) {
    let count = 0;
    
    Object.values(this.gameState.entities).forEach(entity => {
      if (entity.id !== this.botId && entity.alive) {
        const distance = this.getDistance(bot, entity);
        if (distance < radius) {
          count++;
        }
      }
    });
    
    return count;
  }

  destroy() {
    clearInterval(this.updateInterval);
  }
}

export default BotController;

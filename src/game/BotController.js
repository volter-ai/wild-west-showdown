class BotController {
  constructor(gameInterface, botId, gameState) {
    this.gameInterface = gameInterface;
    this.botId = botId;
    this.gameState = gameState;
    this.updateInterval = setInterval(() => this.update(), 100);
    
    // Bot personality traits (randomized to create variety)
    this.personality = {
      aggressiveness: 0.3 + Math.random() * 0.5, // How likely to engage in combat
      greediness: 0.3 + Math.random() * 0.5,     // How much they prioritize gold
      bravery: 0.3 + Math.random() * 0.5,        // How much health they're willing to lose
      patience: 0.3 + Math.random() * 0.5        // How long they'll mine/pursue a target
    };
    
    // Bot state tracking
    this.state = {
      currentTarget: null,
      lastDecisionTime: 0,
      lastActionTime: 0,
      currentAction: 'idle',
      stuckCheckPosition: null,
      stuckCheckTime: 0,
      avoidanceDirection: null,
      lastMoveDirection: { dx: 0, dy: 0 },
      miningAttemptTime: 0
    };
  }

  update() {
    const bot = this.gameState?.entities?.[this.botId];
    if (!bot || bot.eliminated) return;
    
    const now = Date.now();
    
    // Only make decisions periodically to simulate human thinking
    if (now - this.state.lastDecisionTime > 500 + Math.random() * 1000) {
      this.makeDecision(bot, now);
      this.state.lastDecisionTime = now;
    }
    
    // Check if bot is stuck
    this.checkIfStuck(bot, now);
    
    // Execute current action
    this.executeCurrentAction(bot, now);
  }
  
  makeDecision(bot, now) {
    // Get relevant game state information
    const nearbyEnemies = this.findNearbyEnemies(bot);
    const nearestGoldMine = this.findNearestGoldMine(bot);
    const isLowHealth = bot.health < bot.maxHealth * 0.3;
    const isLowAmmo = bot.ammo < 2;
    
    // Decision making based on current situation
    if (bot.reloading) {
      // If reloading, just wait or move to safety
      this.state.currentAction = 'move_to_safety';
      return;
    }
    
    if (isLowAmmo && !bot.reloading) {
      // Need to reload
      this.state.currentAction = 'reload';
      return;
    }
    
    if (isLowHealth && nearbyEnemies.length > 0 && this.personality.bravery < 0.5) {
      // Low health and enemies nearby - retreat if not brave
      this.state.currentAction = 'retreat';
      return;
    }
    
    // Decide between combat and mining based on personality and situation
    const combatWeight = this.personality.aggressiveness * (nearbyEnemies.length > 0 ? 1.5 : 0.5);
    const miningWeight = this.personality.greediness * (nearestGoldMine ? 1.2 : 0.3);
    
    if (combatWeight > miningWeight && nearbyEnemies.length > 0) {
      // Choose combat
      const target = nearbyEnemies[0];
      this.state.currentTarget = target.id;
      
      const distance = this.getDistance(bot, target);
      
      if (distance < 250 && bot.ammo > 0) {
        // Close enough to shoot
        this.state.currentAction = 'shoot';
      } else {
        // Move toward target
        this.state.currentAction = 'pursue_target';
      }
    } else if (nearestGoldMine) {
      // Choose mining
      const distance = this.getDistance(bot, nearestGoldMine);
      
      if (distance < 80) {
        // Close enough to mine
        this.state.currentAction = 'mine';
        this.state.miningAttemptTime = now;
      } else {
        // Move toward gold mine
        this.state.currentAction = 'move_to_mine';
      }
    } else {
      // No clear objective, wander around
      this.state.currentAction = 'wander';
      
      // Occasionally check for a new target
      if (Math.random() < 0.3) {
        this.findNewTarget(bot);
      }
    }
  }
  
  executeCurrentAction(bot, now) {
    switch (this.state.currentAction) {
      case 'shoot':
        // Only shoot every so often to simulate human reaction time
        if (now - this.state.lastActionTime > 300 + Math.random() * 500) {
          this.gameInterface.sendGameEvent('shoot', { userId: this.botId });
          this.state.lastActionTime = now;
          
          // Move a bit randomly after shooting to simulate dodging
          if (Math.random() < 0.4) {
            const dx = (Math.random() - 0.5) * 0.5;
            const dy = (Math.random() - 0.5) * 0.5;
            this.moveBot(dx, dy);
          }
        }
        break;
        
      case 'reload':
        this.gameInterface.sendGameEvent('reload', { userId: this.botId });
        // Move randomly while reloading
        const dx = (Math.random() - 0.5) * 0.3;
        const dy = (Math.random() - 0.5) * 0.3;
        this.moveBot(dx, dy);
        break;
        
      case 'pursue_target':
        const target = this.gameState.entities[this.state.currentTarget];
        if (target && !target.eliminated) {
          // Move toward target with some randomness
          const directionToTarget = this.getDirectionTo(bot, target);
          const randomOffset = { 
            dx: (Math.random() - 0.5) * 0.2, 
            dy: (Math.random() - 0.5) * 0.2 
          };
          
          this.moveBot(
            directionToTarget.dx + randomOffset.dx, 
            directionToTarget.dy + randomOffset.dy
          );
        } else {
          // Target lost, go back to wandering
          this.state.currentAction = 'wander';
          this.state.currentTarget = null;
        }
        break;
        
      case 'retreat':
        // Find nearest enemy and move away from them
        const nearestEnemy = this.findNearbyEnemies(bot)[0];
        if (nearestEnemy) {
          const directionFromEnemy = this.getDirectionTo(nearestEnemy, bot);
          this.moveBot(directionFromEnemy.dx, directionFromEnemy.dy);
        } else {
          this.state.currentAction = 'wander';
        }
        break;
        
      case 'move_to_mine':
        const nearestMine = this.findNearestGoldMine(bot);
        if (nearestMine) {
          const directionToMine = this.getDirectionTo(bot, nearestMine);
          this.moveBot(directionToMine.dx, directionToMine.dy);
        } else {
          this.state.currentAction = 'wander';
        }
        break;
        
      case 'mine':
        // Send mining action and stay still
        this.gameInterface.sendGameEvent('mine', { userId: this.botId });
        this.moveBot(0, 0);
        
        // If mining for too long without success, try moving closer
        if (now - this.state.miningAttemptTime > 4000 && !bot.isMining) {
          this.state.currentAction = 'move_to_mine';
        }
        break;
        
      case 'move_to_safety':
        // Move toward center of map but away from enemies
        const centerDirection = this.getDirectionTo(bot, { 
          x: this.gameState.worldSize.width / 2, 
          y: this.gameState.worldSize.height / 2 
        });
        
        // Blend with avoidance from enemies
        const nearbyEnemy = this.findNearbyEnemies(bot)[0];
        if (nearbyEnemy) {
          const avoidDirection = this.getDirectionTo(nearbyEnemy, bot);
          this.moveBot(
            (centerDirection.dx + avoidDirection.dx) / 2,
            (centerDirection.dy + avoidDirection.dy) / 2
          );
        } else {
          this.moveBot(centerDirection.dx, centerDirection.dy);
        }
        break;
        
      case 'wander':
      default:
        // Change direction occasionally
        if (Math.random() < 0.1 || 
            (this.state.lastMoveDirection.dx === 0 && this.state.lastMoveDirection.dy === 0)) {
          const dx = (Math.random() - 0.5) * 0.8;
          const dy = (Math.random() - 0.5) * 0.8;
          this.moveBot(dx, dy);
        } else {
          // Continue in same direction with slight variation
          const variation = { 
            dx: (Math.random() - 0.5) * 0.2, 
            dy: (Math.random() - 0.5) * 0.2 
          };
          this.moveBot(
            this.state.lastMoveDirection.dx + variation.dx,
            this.state.lastMoveDirection.dy + variation.dy
          );
        }
        break;
    }
    
    // Avoid other bots
    this.avoidOtherBots(bot);
  }
  
  moveBot(dx, dy) {
    // Normalize direction vector if it's too large
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > 1) {
      dx = dx / magnitude;
      dy = dy / magnitude;
    }
    
    // Store last move direction
    this.state.lastMoveDirection = { dx, dy };
    
    // Send movement event
    this.gameInterface.sendGameEvent('joystick_move', {
      userId: this.botId,
      dx: dx,
      dy: dy
    });
  }
  
  findNearbyEnemies(bot) {
    return Object.values(this.gameState.entities)
      .filter(entity => {
        // Don't target self or eliminated players
        if (entity.id === this.botId || entity.eliminated) return false;
        
        // Don't target other bots if this is a player bot
        if (!bot.botType && entity.isBot) return false;
        
        // Sheriff targets bandits, bandits target players
        if (bot.botType === 'sheriff' && entity.botType !== 'bandit') return false;
        if (bot.botType === 'bandit' && entity.isBot) return false;
        
        // Check distance
        const distance = this.getDistance(bot, entity);
        return distance < 400; // Detection range
      })
      .sort((a, b) => {
        // Sort by distance
        return this.getDistance(bot, a) - this.getDistance(bot, b);
      });
  }
  
  findNearestGoldMine(bot) {
    if (!this.gameState.goldMines) return null;
    
    return this.gameState.goldMines
      .map(mine => ({
        ...mine,
        distance: this.getDistance(bot, mine)
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }
  
  getDistance(entity1, entity2) {
    return Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    );
  }
  
  getDirectionTo(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    
    if (magnitude === 0) return { dx: 0, dy: 0 };
    
    return {
      dx: dx / magnitude,
      dy: dy / magnitude
    };
  }
  
  findNewTarget(bot) {
    // Find a new target based on bot type
    const potentialTargets = Object.values(this.gameState.entities)
      .filter(entity => {
        if (entity.id === this.botId || entity.eliminated) return false;
        
        if (bot.botType === 'sheriff') {
          return entity.botType === 'bandit';
        } else if (bot.botType === 'bandit') {
          return !entity.isBot;
        } else {
          // Player bot - target anyone
          return true;
        }
      });
    
    if (potentialTargets.length > 0) {
      // Pick a random target with preference for closer ones
      potentialTargets.sort((a, b) => {
        return this.getDistance(bot, a) - this.getDistance(bot, b);
      });
      
      // Pick from first few targets with some randomness
      const targetIndex = Math.floor(Math.random() * Math.min(3, potentialTargets.length));
      this.state.currentTarget = potentialTargets[targetIndex].id;
    }
  }
  
  checkIfStuck(bot, now) {
    // Check if bot is stuck by comparing position over time
    if (!this.state.stuckCheckPosition) {
      this.state.stuckCheckPosition = { x: bot.x, y: bot.y };
      this.state.stuckCheckTime = now;
      return;
    }
    
    // Check every 2 seconds
    if (now - this.state.stuckCheckTime > 2000) {
      const distance = this.getDistance(bot, this.state.stuckCheckPosition);
      
      // If barely moved and trying to move, might be stuck
      if (distance < 10 && 
          (Math.abs(this.state.lastMoveDirection.dx) > 0.1 || 
           Math.abs(this.state.lastMoveDirection.dy) > 0.1)) {
        
        // Generate a new random direction to try to get unstuck
        this.state.avoidanceDirection = {
          dx: (Math.random() - 0.5) * 2,
          dy: (Math.random() - 0.5) * 2
        };
        
        // Use this direction for a while
        setTimeout(() => {
          this.state.avoidanceDirection = null;
        }, 1000);
      }
      
      // Reset check
      this.state.stuckCheckPosition = { x: bot.x, y: bot.y };
      this.state.stuckCheckTime = now;
    }
  }
  
  avoidOtherBots(bot) {
    // Find nearby bots to avoid clustering
    const nearbyBots = Object.values(this.gameState.entities)
      .filter(entity => {
        return entity.id !== this.botId && !entity.eliminated && 
               this.getDistance(bot, entity) < 60;
      });
    
    if (nearbyBots.length > 0) {
      // Calculate average avoidance vector
      let avoidX = 0;
      let avoidY = 0;
      
      nearbyBots.forEach(otherBot => {
        const direction = this.getDirectionTo(otherBot, bot);
        const distance = this.getDistance(bot, otherBot);
        const factor = 1 - (distance / 60); // Stronger avoidance for closer bots
        
        avoidX += direction.dx * factor;
        avoidY += direction.dy * factor;
      });
      
      // Normalize
      const magnitude = Math.sqrt(avoidX * avoidX + avoidY * avoidY);
      if (magnitude > 0) {
        avoidX /= magnitude;
        avoidY /= magnitude;
      }
      
      // Blend with current movement
      const blendFactor = 0.3; // How much to prioritize avoidance
      const newDx = this.state.lastMoveDirection.dx * (1 - blendFactor) + avoidX * blendFactor;
      const newDy = this.state.lastMoveDirection.dy * (1 - blendFactor) + avoidY * blendFactor;
      
      this.moveBot(newDx, newDy);
    }
  }

  destroy() {
    clearInterval(this.updateInterval);
  }
}

export default BotController;

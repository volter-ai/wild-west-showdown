class BotController {
  constructor(gameInterface, botId, gameState) {
    this.gameInterface = gameInterface;
    this.botId = botId;
    this.gameState = gameState;
    this.updateInterval = setInterval(() => this.update(), 100);
  }

  update() {
    // code bot actions here

    // this is how we can send actions
    // gameInterface.sendGameEvent('action_name', {userId: this.botId, actionDataGoesHere});
  }

  destroy() {
    clearInterval(this.updateInterval);
  }
}

export default BotController;

export class ClientSimulation {
  constructor(gameInterface, width, height) {
    this.gameInterface = gameInterface;
    this.gameState = null;

    this.gameInterface.on('game_state_update', (data) => {
      if (this.gameState) {
        Object.assign(this.gameState, data);
      } else {
        this.gameState = data;
      }
    });
  }

  update(deltaTime) {
    // Client does no simulation
  }
}

# Wild West Showdown - Game Design Document

    ## Game Overview
    Wild West Showdown is a multiplayer battle royale game set in the wild west. Players control cowboys in a showdown to be the last one standing. The game features a shrinking safe zone, power-ups, and a cover system.

    ## Core Gameplay
    - **Objective**: Be the last cowboy standing
    - **Player Count**: Up to 8 players (with bots filling empty slots)
    - **Game Duration**: 2 minutes per round

    ## Game Mechanics

    ### Movement
    - Players use a joystick control to move their cowboy around the map
    - Movement is fluid and responsive, allowing for quick dodging and positioning

    ### Combat
    - Players tap anywhere on the screen to shoot in that direction
    - Bullets travel across the map and damage any player they hit
    - Players have 100 health points and die when health reaches zero

    ### Cover System
    - Players can take cover by tapping the shield button
    - Taking cover reduces damage taken by 50% but also reduces movement speed by 50%
    - Strategic use of cover is essential for survival

    ### Safe Zone
    - The play area gradually shrinks over time, forcing players to confront each other
    - Players outside the safe zone take continuous damage
    - The safe zone starts shrinking after 30 seconds and continues until the end of the match

    ### Power-ups
    - **Health Power-up**: Restores 50 health points
    - **Speed Power-up**: Increases movement speed by 20%
    - **Gun Power-up**: Increases damage by 50% and reduces cooldown between shots by 20%
    - Power-ups spawn randomly across the map throughout the match

    ## Visual Style
    - Wild west themed environment with desert landscapes
    - Cowboy characters with different hat styles
    - Simple, clean UI with western-themed elements

    ## Controls
    - **Joystick** (bottom right): Move character
    - **Tap Screen**: Shoot in that direction
    - **Shield Button** (bottom left): Take cover/stand up

    ## Technical Implementation
    - Built using the IGE5 engine for multiplayer functionality
    - React-based UI components
    - Asset-based rendering for characters, bullets, and power-ups

    ## Future Enhancements
    - Additional maps (saloon, canyon, ghost town)
    - Character customization options
    - Special abilities for different cowboy types
    - Leaderboard system for tracking wins
    
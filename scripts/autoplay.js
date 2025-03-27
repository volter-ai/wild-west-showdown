const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('url', {
    alias: 'u',
    description: 'URL of the game to automate',
    type: 'string',
    default: 'http://localhost:8000'
  })
  .option('width', {
    alias: 'w',
    description: 'Browser window width',
    type: 'number',
    default: 1920
  })
  .option('height', {
    alias: 'h',
    description: 'Browser window height',
    type: 'number',
    default: 1080
  })
  .option('duration', {
    alias: 'd',
    description: 'Gameplay duration in seconds',
    type: 'number',
    default: 10
  })
  .help()
  .argv;

// Ensure output directories exist
const outputDir = path.join(__dirname, '../assets');
const screenshotsDir = path.join(outputDir, 'screenshots');
const videosDir = path.join(outputDir, 'screen_recordings');

[outputDir, screenshotsDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function autoplayGame() {
  // Calculate window size with additional space for browser chrome
  // Browser window will be larger than viewport - this is fine
  const windowWidth = Math.max(argv.width, 500) + 50; // Browser might have minimum width constraints
  const windowHeight = argv.height + 150; // Add extra space for browser header

  // Launch browser with sufficient window size
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--window-size=${windowWidth},${windowHeight}`,
      '--disable-infobars'
    ]
  });

  const page = await browser.newPage();

  // Set exact viewport size - this is what matters for recording
  await page.setViewport({
    width: argv.width,
    height: argv.height,
    deviceScaleFactor: 1
  });

  console.log(`Viewport set to: ${argv.width}x${argv.height}`)

  // Wait a moment for the page to properly size
  await page.waitForTimeout(1000);

  // Verify the viewport is correctly set
  const viewportSize = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }));
  console.log('Actual viewport size:', viewportSize);

  // Configure the recorder to capture only the viewport area
  const recorderConfig = {
    followNewTab: true,
    fps: 25,
    ffmpeg_Path: null,
    videoFrame: {
      width: argv.width,
      height: argv.height
    },
    aspectRatio: `${argv.width}:${argv.height}`,
    captureFromSurface: true,
    recordingArea: {
      x: 0,
      y: 0,
      width: argv.width,
      height: argv.height
    }
  };

  const recorder = new PuppeteerScreenRecorder(page, recorderConfig);
  const videoPath = path.join(videosDir, `gameplay-${argv.width}x${argv.height}.mp4`);

  try {
    // Start recording
    await recorder.start(videoPath);

    // Navigate to the game with autoplay parameter
    console.log(`Navigating to game at ${argv.url}?autoplay=true...`);
    await page.goto(`${argv.url}?autoplay=true`, { waitUntil: 'networkidle0' });

    // Take screenshot of home screen
    await page.screenshot({
      path: path.join(screenshotsDir, `home-screen-${argv.width}x${argv.height}.png`)
    });

    // Wait for name input, clear it, and set player name
    console.log('Setting player name...');
    await page.waitForSelector('input[type="text"]');

    // Clear the input field before typing
    await page.evaluate(() => {
      document.querySelector('input[type="text"]').value = '';
    });

    await page.type('input[type="text"]', 'AutoPlayer');

    // Take screenshot after name input
    await page.screenshot({
      path: path.join(screenshotsDir, `name-entered-${argv.width}x${argv.height}.png`)
    });

    // Find and click the Play button (single player mode)
    console.log('Starting game...');
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.trim() === 'Play') {
        await button.click();
        break;
      }
    }

    // Take screenshot of matchmaking screen
    await page.waitForTimeout(1000); // Wait for transition
    await page.screenshot({
      path: path.join(screenshotsDir, `matchmaking-${argv.width}x${argv.height}.png`)
    });

    // Wait for game to start and take screenshot
    console.log('Waiting for game to start...');
    await page.waitForTimeout(5000); // Wait for bots to join and game to start
    await page.screenshot({
      path: path.join(screenshotsDir, `game-started-${argv.width}x${argv.height}.png`)
    });

    // Simulate gameplay for the specified duration
    console.log(`Simulating gameplay for ${argv.duration} seconds...`);
    await simulateGameplay(page, argv.duration * 1000);
    console.log(`Simulation done`);
  } catch (error) {
    console.error('Error during automation:', error);
  } finally {
    console.log(`Shutting down`);
    // Stop recording
    await recorder.stop();

    // Close browser
    await browser.close();

    console.log('Automation completed!');
    console.log('Screenshots saved in:', screenshotsDir);
    console.log('Video saved as:', videoPath);
  }
}

async function simulateGameplay(page, duration) {
  // Simulate random movement for the specified duration
  const startTime = Date.now();

  while (Date.now() - startTime < duration) {
    // Take periodic screenshots during gameplay
    // Take screenshots at regular intervals (every ~5 seconds)
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    if (elapsedSeconds % 5 === 0 && (Date.now() - startTime) % 1000 < 100) {
      await page.screenshot({
        path: path.join(screenshotsDir, `gameplay-${elapsedSeconds}s-${argv.width}x${argv.height}.png`)
      });
    }

    await page.waitForTimeout(100); // Wait a bit
  }
}

// Run the automation
autoplayGame().catch(console.error);
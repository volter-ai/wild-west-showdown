import ReactDOM from 'react-dom/client';
import WebFontProvider from './WebFontProvider';
import App from './App';
import React, { useState, useEffect, useRef } from 'react';
import { ASSETS } from './assetManifest';

// Fixed width for simulation
const FIXED_WIDTH = 390;

const ResponsiveLayout = ({ children }) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [dimensions, setDimensions] = useState({ width: FIXED_WIDTH, height: 844, scale: 1 });
  const containerRef = useRef(null);

  // Load plugins after component mount
  useEffect(() => {
    // Import all plugins
    // This uses webpack's require.context to dynamically import all JS files in the plugins directory
    try {
      // Check if plugins directory exists and has files
      const pluginsContext = require.context('./plugins', false, /\.js$/);
      const pluginKeys = pluginsContext.keys();

      if (pluginKeys.length > 0) {
        pluginKeys.forEach(pluginsContext);
        console.log(`Loaded ${pluginKeys.length} plugins successfully`);
      } else {
        console.log('No plugins found in the plugins directory');
      }
    } catch (error) {
      // Handle the case when plugins directory doesn't exist or can't be accessed
      console.log('Plugins directory not found or empty - continuing without plugins');
    }
  }, []);

  // Calculate scale based on container width
  const updateDimensions = () => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    // Calculate scale based on available width
    const scale = containerRect.width / FIXED_WIDTH;

    // Calculate the simulated height based on the container's actual height and scale
    const simulatedHeight = containerRect.height / scale;

    setDimensions({
      width: FIXED_WIDTH,
      height: simulatedHeight,
      scale: scale
    });
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      updateDimensions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use ResizeObserver to update dimensions when container changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);

    // Ensure dimensions update immediately on mount
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (!isDesktop) {
    return (
      <div ref={containerRef} className="w-screen h-screen">
        <div
          style={{
            width: FIXED_WIDTH,
            height: dimensions.height,
            transform: `scale(${dimensions.scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative">
      {/* Desktop-only background with blur */}
      <div className="fixed inset-0 z-[-10000] bg-black">
        <img
          src="assets/thumbnail.png"
          alt="Background"
          className="w-full h-full object-cover opacity-50 blur-xl"
        />
      </div>

      {/* Content container */}
      <div className="relative min-h-screen mx-auto flex items-center justify-center">
        {/* Fixed size container on desktop */}
        <div
          ref={containerRef}
          className="w-[390px] h-[844px] rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Content layer - allows negative z-indices to show */}
          <div className="relative w-full h-full overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Load manifest.json and transform it to match ASSETS structure
const loadManifest = async () => {
  try {
    const response = await fetch('assets/manifest.json');
    if (!response.ok) {
      throw new Error(`Failed to load manifest.json: ${response.status}`);
    }
    const manifestData = await response.json();

    // Transform the manifest data to match ASSETS structure
    const transformedData = ASSETS;

    // Process each bundle in the manifest
    if (manifestData.bundles && Array.isArray(manifestData.bundles)) {
      manifestData.bundles.forEach(bundle => {
        // Create an entry for this bundle name if it doesn't exist
        if (!transformedData[bundle.name]) {
          transformedData[bundle.name] = {};
        }

        // Process each asset in the bundle
        if (bundle.assets && Array.isArray(bundle.assets)) {
          bundle.assets.forEach(asset => {
            // Use the alias as the key
            const key = asset.alias;

            // Create the asset entry with the expected structure
            transformedData[bundle.name][key] = {
              path: asset.src || '',
              ...(asset.data || {})
            };
          });
        }
      });
    }

    // Directly assign the transformed data to ASSETS
    Object.assign(ASSETS, transformedData);

    console.log('Manifest loaded and ASSETS updated successfully');
  } catch (error) {
    console.error('Error loading manifest:', error);
  }
  console.log(ASSETS);
};

// Load the manifest before rendering the app
// loadManifest().then(() => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <WebFontProvider>
      <ResponsiveLayout>
        <App />
      </ResponsiveLayout>
    </WebFontProvider>
  );
// });

export default ResponsiveLayout;
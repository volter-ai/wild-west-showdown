import React, { useEffect } from 'react';
import { FONTS } from './fontManifest';

// Common font weights used in web design
const COMMON_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '100i', '200i', '300i', '400i', '500i', '600i', '700i', '800i', '900i'];

const WebFontProvider = ({ children }) => {
  useEffect(() => {
    // Create a script element to load the WebFontLoader
    const webFontScript = document.createElement('script');
    webFontScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/webfont/1.6.28/webfontloader.js';
    webFontScript.async = true;

    // Configure and load fonts when the script loads
    webFontScript.onload = () => {
      // Create font families array with weights
      const fontFamiliesWithWeights = FONTS.flatMap(font => {
        // For each font, create entries for all common weights
        return COMMON_WEIGHTS.map(weight => `${font}:${weight}`);
      });

      window.WebFont.load({
        google: {
          families: fontFamiliesWithWeights
        },
        active: () => {
          // Fonts have loaded successfully
          console.log('All fonts have loaded');
          document.documentElement.classList.add('fonts-loaded');
        },
        inactive: () => {
          // Fonts failed to load
          console.warn('Fonts failed to load');
        },
        // Adding a timeout to prevent hanging if some weights aren't available
        timeout: 2000
      });
    };

    // Add the script to the document
    document.head.appendChild(webFontScript);

    // Cleanup
    return () => {
      if (document.head.contains(webFontScript)) {
        document.head.removeChild(webFontScript);
      }
    };
  }, []);

  return <>{children}</>;
};

export default WebFontProvider;
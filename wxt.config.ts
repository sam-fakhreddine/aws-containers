import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // Target Firefox with Manifest V2
  browser: 'firefox',
  manifestVersion: 2,
  
  manifest: {
    manifest_version: 2,
    name: 'AWS Profile Containers',
    description: 'Open AWS profiles from credentials file in separate containers.',
    
    // Permissions required for the extension
    permissions: [
      'contextualIdentities', // Firefox container management
      'cookies',              // Cookie access for AWS sessions
      'storage',              // Local storage for settings
      'tabs',                 // Tab management
      'alarms',               // Background alarms
      'http://127.0.0.1:10999/*',  // Local API server access
      'http://localhost:10999/*'   // Local API server access (alternative)
    ],
    
    // Firefox-specific settings
    browser_specific_settings: {
      gecko: {
        id: 'aws-profile-containers@samfakhreddine.dev'
      }
    },
    
    // Content Security Policy (Manifest V2 format)
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'"
    },
    
    // Sidebar action configuration (sidebar only - no popup)
    sidebar_action: {
      default_icon: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png'
      },
      default_title: 'AWS Profile Containers',
      default_panel: 'popup.html',
      open_at_install: true
    },
    
    // Options page configuration
    // Note: WXT automatically detects the options entrypoint and generates options_ui
    // The open_in_tab property should be added here but may not appear in the manifest
    // depending on WXT's manifest generation logic
    options_ui: {
      open_in_tab: true
    } as any,
    
    // Extension icons
    icons: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '96': 'icons/icon-96.png',
      '128': 'icons/icon-128.png'
    },
    
    // Data collection permissions
    data_collection_permissions: {
      data_collection: false
    }
  },
  
  // Vite configuration
  vite: () => ({
    // React plugin for JSX/TSX support
    plugins: [react()],
    
    // Define global constants
    define: {
      __VERSION__: JSON.stringify(process.env.npm_package_version || '0.5.0'),
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString().slice(0, 16))
    },
    
    // Module resolution configuration
    resolve: {
      alias: {
        '@/': `${resolve(__dirname, 'src')}/`,
        '@src/': `${resolve(__dirname, 'src')}/`,
        '@': resolve(__dirname, 'src'),
        '@src': resolve(__dirname, 'src')
      }
    }
  }),
  
  // Output directory for built extension
  outDir: '.output',
  
  // Static assets configuration
  // WXT automatically copies all files from the public/ directory to the build output.
  // This includes:
  // - public/icons/ → .output/firefox-mv2/icons/
  // - public/img/ → .output/firefox-mv2/img/
  // - public/*.{png,svg,css} → .output/firefox-mv2/
  // No additional configuration is needed for static asset handling.
});

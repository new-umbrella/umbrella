import vm from 'vm';
import fs from 'fs';

import {
  Category,
  DetailedItem,
  ContentService,
  ExtractorAudio,
  ExtractorVideo,
  RawAudio,
  RawVideo,
} from './models';

export class PluginLoader {
  private pluginPath: string;

  constructor(pluginPath: string) {
    this.pluginPath = pluginPath;
  }

  loadPlugin(): ContentService {
    // Initialize Node.js modules with error handling
    let CryptoJS: any = null;
    let cheerio: any = null;

    try {
      CryptoJS = require('crypto-js');
      console.log('CryptoJS loaded successfully');
    } catch (err) {
      console.error('Failed to load crypto-js:', err);
    }

    try {
      cheerio = require('cheerio');
      console.log('Cheerio loaded successfully');
    } catch (err) {
      console.error('Failed to load cheerio:', err);
    }

    // Create sandbox with Node.js modules
    const sandbox: any = {
      console,
      fetch,
      require, // Basic Node.js require for built-in modules like 'buffer'
      CryptoJS, // Regular CryptoJS
      cheerio, // Regular Cheerio
      exports: {},
      builtin: ['fetch'],
      module: {exports: {}},
    };

    // Load and execute the plugin
    try {
      const pluginCode = fs.readFileSync(this.pluginPath, 'utf-8');
      const script = new vm.Script(pluginCode);
      const context = vm.createContext(sandbox);
      script.runInContext(context);
    } catch (error) {
      console.error('Error loading plugin:', error);
      throw error;
    }

    // Get the plugin instance
    const pluginInstance: any = sandbox.module.exports;

    // Create the content service
    const contentService = {
      search(query: string, page?: number): Promise<Category> {
        return pluginInstance.search(query, page) as Promise<Category>;
      },
      getCategory(category: string, page?: number): Promise<Category> {
        return pluginInstance.getCategory(category, page);
      },
      getHomeCategories(): Promise<Category[]> {
        return pluginInstance.getHomeCategories() as Promise<Category[]>;
      },
      getItemDetails(id: string): Promise<DetailedItem> {
        return pluginInstance.getItemDetails(id);
      },
      getItemMedia(
        id: string,
      ): Promise<(RawAudio | ExtractorAudio | RawVideo | ExtractorVideo)[]> {
        return pluginInstance.getItemMedia(id);
      },
    } as ContentService;

    // Return the content service
    return contentService;
  }
}

export default PluginLoader;

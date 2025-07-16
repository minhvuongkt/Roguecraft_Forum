import { database } from './database.js';
import { autoPosterOrchestrator } from './orchestrator.js';

async function initializeAutoPoster() {
  try {
    console.log('Initializing Auto-Poster...');
    
    // Initialize database
    await database.init();
    console.log('Database initialized successfully');
    
    // Initialize orchestrator
    await autoPosterOrchestrator.init();
    console.log('Orchestrator initialized successfully');
    
    // Add some default website sources if none exist
    const existingWebsites = await database.getWebsiteSources();
    if (existingWebsites.length === 0) {
      console.log('Adding default website sources...');
      
      const defaultSources = [
        { name: 'Sport News', url: 'https://sportnewss.livextop.com', enabled: true },
        { name: 'Boom News', url: 'https://boomnews.online', enabled: true },
        { name: 'People', url: 'https://people.com', enabled: false },
        { name: 'CNN', url: 'https://cnn.com', enabled: false },
      ];
      
      for (const source of defaultSources) {
        await database.addWebsiteSource(source);
        console.log(`Added website source: ${source.name}`);
      }
    }
    
    console.log('Auto-Poster initialization completed successfully!');
    console.log('You can now access the dashboard at /auto-poster');
    
  } catch (error) {
    console.error('Failed to initialize Auto-Poster:', error);
    process.exit(1);
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeAutoPoster();
}

export { initializeAutoPoster };
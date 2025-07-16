import express from 'express';
import { autoPosterOrchestrator } from './orchestrator.js';
import { database } from './database.js';

const router = express.Router();

// Initialize auto-poster
router.post('/init', async (req, res) => {
  try {
    await autoPosterOrchestrator.init();
    res.json({ success: true, message: 'Auto-poster initialized successfully' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get status
router.get('/status', async (req, res) => {
  try {
    const status = await autoPosterOrchestrator.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Start scheduled posting
router.post('/start', async (req, res) => {
  try {
    await autoPosterOrchestrator.startScheduledPosting();
    res.json({ success: true, message: 'Scheduled posting started' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Stop scheduled posting
router.post('/stop', async (req, res) => {
  try {
    autoPosterOrchestrator.stopScheduledPosting();
    res.json({ success: true, message: 'Scheduled posting stopped' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Run posting cycle manually
router.post('/run', async (req, res) => {
  try {
    const stats = await autoPosterOrchestrator.runPostingCycle();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test connections
router.get('/test-connections', async (req, res) => {
  try {
    const connections = await autoPosterOrchestrator.testConnections();
    res.json(connections);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Configuration endpoints
router.get('/config', async (req, res) => {
  try {
    const config = await database.getAllConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.put('/config', async (req, res) => {
  try {
    const updates = req.body;
    await autoPosterOrchestrator.updateConfig(updates);
    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.put('/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await database.setConfig(key, value);
    res.json({ success: true, message: `Config ${key} updated` });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Website sources endpoints
router.get('/websites', async (req, res) => {
  try {
    const websites = await database.getWebsiteSources();
    res.json(websites);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.post('/websites', async (req, res) => {
  try {
    const { name, url, enabled = true } = req.body;
    const id = await database.addWebsiteSource({ name, url, enabled });
    res.json({ success: true, id, message: 'Website source added' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.put('/websites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await database.updateWebsiteSource(parseInt(id), updates);
    res.json({ success: true, message: 'Website source updated' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.delete('/websites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await database.deleteWebsiteSource(parseInt(id));
    res.json({ success: true, message: 'Website source deleted' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Articles endpoints
router.get('/articles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const articles = await database.getUnpostedArticles(limit);
    res.json(articles);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// History endpoints
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = await database.getPostingHistory(limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Shutdown endpoint
router.post('/shutdown', async (req, res) => {
  try {
    await autoPosterOrchestrator.shutdown();
    res.json({ success: true, message: 'Auto-poster shut down' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
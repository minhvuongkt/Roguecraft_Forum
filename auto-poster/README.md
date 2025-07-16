# Auto-Poster Tool

This is an automated content scraping and posting tool that:

1. **Scrapes articles** from WordPress news sites
2. **Optimizes content** with GPT API for SEO
3. **Posts to WordPress** automatically
4. **Posts to Threads** via GPM integration

## Features

### Web Scraping
- Extracts article links from news websites
- Downloads high-quality thumbnails
- Scrapes article content with images and videos
- Filters out ads and unwanted content

### Content Optimization
- GPT API integration for SEO optimization
- Title and content enhancement
- Content expansion for short articles
- Social media post generation for Threads

### WordPress Integration
- Automatic posting to WordPress sites
- Featured image handling
- Image embedding in content
- Post status tracking

### Threads Integration
- Posts to Threads via GPM (GoLogin Profile Manager)
- Scheduled posting with delays
- Post status monitoring
- Profile group management

### Configuration Options
- WordPress connection settings
- GPT API configuration
- GPM API settings
- Posting limits and scheduling
- Website source management

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Initialize the auto-poster**:
   Access `/auto-poster` in your browser and configure:
   - WordPress URL, username, and password
   - GPT API key
   - GPM API URL and profile group ID
   - Posting limits and schedule

3. **Add website sources**:
   - Add news websites to scrape from
   - Enable/disable sources as needed

4. **Start the scheduler**:
   Click "Start" to begin automatic posting cycles

## Usage

### Manual Operation
- Visit `/auto-poster` dashboard
- Click "Run Now" to execute a posting cycle immediately
- Monitor status and history in the dashboard

### Automated Operation
- Configure posting schedule (cron format)
- Set posting limits (daily, per batch)
- The system will automatically:
  1. Scrape articles from enabled websites
  2. Optimize content with GPT
  3. Post to WordPress
  4. Post to Threads

### Monitoring
- View connection status for all services
- Track posting history and statistics
- Monitor recent activity and errors

## Configuration

### Required Settings
- **WordPress URL**: Your WordPress site URL
- **WordPress Username**: WordPress admin username
- **WordPress Password**: WordPress admin password
- **GPT API Key**: OpenAI API key for content optimization
- **GPM API URL**: GoLogin Profile Manager API endpoint
- **GPM Profile Group ID**: ID of the profile group for Threads posting

### Optional Settings
- **Max Posts Per Day**: Daily posting limit
- **Max Posts Per Batch**: Posts per execution cycle
- **Articles Per Site**: Articles to scrape per website
- **Posting Schedule**: Cron expression for automatic scheduling
- **Thread Posting Delay**: Delay between Thread posts

## API Endpoints

- `GET /api/auto-poster/status` - Get current status
- `POST /api/auto-poster/start` - Start scheduled posting
- `POST /api/auto-poster/stop` - Stop scheduled posting
- `POST /api/auto-poster/run` - Run posting cycle manually
- `GET /api/auto-poster/config` - Get configuration
- `PUT /api/auto-poster/config` - Update configuration
- `GET /api/auto-poster/websites` - Get website sources
- `POST /api/auto-poster/websites` - Add website source
- `GET /api/auto-poster/history` - Get posting history

## Database Schema

The auto-poster uses SQLite with the following tables:
- `scraped_articles` - Stores scraped article data
- `website_sources` - Manages scraping sources
- `app_config` - Stores configuration settings
- `posting_history` - Tracks posting activities

## Technology Stack

- **Backend**: Node.js, TypeScript, Express
- **Database**: SQLite
- **Web Scraping**: Playwright
- **Content Optimization**: OpenAI GPT API
- **WordPress Integration**: WordPress REST API
- **Threads Integration**: GPM API
- **Scheduling**: Node-cron
- **Frontend**: React, TypeScript
- **UI Components**: Radix UI with Tailwind CSS

## Notes

- The tool is designed to work with WordPress sites that have REST API enabled
- GPM (GoLogin Profile Manager) is required for Threads posting
- Content optimization requires an OpenAI API key
- All scraped images are saved locally and optimized with Sharp
- The system respects posting limits to avoid spam
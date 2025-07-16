import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Play, Square, Settings, Globe, FileText, History } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AutoPosterConfig {
  wordpress_url: string;
  wordpress_username: string;
  wordpress_password: string;
  gpt_api_key: string;
  gmp_api_url: string;
  gmp_profile_group_id: string;
  max_posts_per_day: string;
  max_posts_per_batch: string;
  articles_per_site: string;
  thread_posting_delay: string;
  thread_count: string;
  posting_schedule: string;
}

interface WebsiteSource {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  created_at: string;
}

interface PostingHistory {
  id: number;
  article_id: number;
  platform: string;
  status: string;
  response_data?: string;
  posted_at: string;
}

interface AutoPosterStatus {
  isRunning: boolean;
  config: AutoPosterConfig | null;
  connections: {
    wordpress: boolean;
    gpt: boolean;
    gpm: boolean;
  };
  stats: {
    totalArticles: number;
    unpostedArticles: number;
    recentPosts: PostingHistory[];
  };
}

const AutoPosterDashboard: React.FC = () => {
  const [status, setStatus] = useState<AutoPosterStatus | null>(null);
  const [config, setConfig] = useState<AutoPosterConfig | null>(null);
  const [websites, setWebsites] = useState<WebsiteSource[]>([]);
  const [history, setHistory] = useState<PostingHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New website form
  const [newWebsite, setNewWebsite] = useState({ name: '', url: '', enabled: true });

  const API_BASE = '/api/auto-poster';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, configRes, websitesRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/status`),
        fetch(`${API_BASE}/config`),
        fetch(`${API_BASE}/websites`),
        fetch(`${API_BASE}/history`)
      ]);

      setStatus(await statusRes.json());
      setConfig(await configRes.json());
      setWebsites(await websitesRes.json());
      setHistory(await historyRes.json());
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/start`, { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Auto-poster started successfully');
        loadData();
      } else {
        setError(result.error || 'Failed to start auto-poster');
      }
    } catch (err) {
      setError('Failed to start auto-poster');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/stop`, { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Auto-poster stopped successfully');
        loadData();
      } else {
        setError(result.error || 'Failed to stop auto-poster');
      }
    } catch (err) {
      setError('Failed to stop auto-poster');
    } finally {
      setLoading(false);
    }
  };

  const handleRunNow = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/run`, { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Posting cycle completed. Scraped: ${result.stats.articlesScraped}, WordPress: ${result.stats.articlesPostedToWordPress}, Threads: ${result.stats.articlesPostedToThreads}`);
        loadData();
      } else {
        setError(result.error || 'Failed to run posting cycle');
      }
    } catch (err) {
      setError('Failed to run posting cycle');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async (key: string, value: string) => {
    try {
      const response = await fetch(`${API_BASE}/config/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      
      const result = await response.json();
      if (result.success) {
        setSuccess(`Configuration updated: ${key}`);
        loadData();
      } else {
        setError(result.error || 'Failed to update configuration');
      }
    } catch (err) {
      setError('Failed to update configuration');
    }
  };

  const handleAddWebsite = async () => {
    try {
      const response = await fetch(`${API_BASE}/websites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebsite)
      });
      
      const result = await response.json();
      if (result.success) {
        setSuccess('Website added successfully');
        setNewWebsite({ name: '', url: '', enabled: true });
        loadData();
      } else {
        setError(result.error || 'Failed to add website');
      }
    } catch (err) {
      setError('Failed to add website');
    }
  };

  const handleUpdateWebsite = async (id: number, updates: Partial<WebsiteSource>) => {
    try {
      const response = await fetch(`${API_BASE}/websites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const result = await response.json();
      if (result.success) {
        setSuccess('Website updated successfully');
        loadData();
      } else {
        setError(result.error || 'Failed to update website');
      }
    } catch (err) {
      setError('Failed to update website');
    }
  };

  const handleDeleteWebsite = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE}/websites/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      if (result.success) {
        setSuccess('Website deleted successfully');
        loadData();
      } else {
        setError(result.error || 'Failed to delete website');
      }
    } catch (err) {
      setError('Failed to delete website');
    }
  };

  const ConnectionStatus = ({ connected }: { connected: boolean }) => (
    <div className="flex items-center space-x-2">
      {connected ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-500" />
      )}
      <span className={connected ? 'text-green-700' : 'text-red-700'}>
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Auto-Poster Dashboard</h1>
        <p className="text-gray-600">Manage automated article scraping and posting</p>
      </div>

      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {status?.isRunning ? (
                <Badge className="bg-green-100 text-green-800">Running</Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Stopped</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.stats.unpostedArticles || 0}</div>
            <div className="text-sm text-gray-600">Unposted articles</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={handleStart}
                disabled={loading || status?.isRunning}
              >
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStop}
                disabled={loading || !status?.isRunning}
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRunNow}
              disabled={loading}
              className="w-full"
            >
              Run Now
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="websites">Websites</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Connections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>WordPress</span>
                  <ConnectionStatus connected={status?.connections.wordpress || false} />
                </div>
                <div className="flex justify-between items-center">
                  <span>GPT API</span>
                  <ConnectionStatus connected={status?.connections.gpt || false} />
                </div>
                <div className="flex justify-between items-center">
                  <span>GPM (Threads)</span>
                  <ConnectionStatus connected={status?.connections.gpm || false} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span>{item.platform}</span>
                      <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>WordPress Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wordpress-url">WordPress URL</Label>
                  <Input
                    id="wordpress-url"
                    value={config?.wordpress_url || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, wordpress_url: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('wordpress_url', e.target.value)}
                    placeholder="https://yoursite.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wordpress-username">Username</Label>
                  <Input
                    id="wordpress-username"
                    value={config?.wordpress_username || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, wordpress_username: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('wordpress_username', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wordpress-password">Password</Label>
                  <Input
                    id="wordpress-password"
                    type="password"
                    value={config?.wordpress_password || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, wordpress_password: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('wordpress_password', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>GPT API Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gpt-api-key">GPT API Key</Label>
                  <Input
                    id="gpt-api-key"
                    type="password"
                    value={config?.gpt_api_key || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, gpt_api_key: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('gpt_api_key', e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>GPM (Threads) Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gmp-api-url">GPM API URL</Label>
                  <Input
                    id="gmp-api-url"
                    value={config?.gmp_api_url || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, gmp_api_url: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('gmp_api_url', e.target.value)}
                    placeholder="http://localhost:8080"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmp-profile-group-id">Profile Group ID</Label>
                  <Input
                    id="gmp-profile-group-id"
                    value={config?.gmp_profile_group_id || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, gmp_profile_group_id: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('gmp_profile_group_id', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Posting Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="max-posts-per-day">Max Posts Per Day</Label>
                  <Input
                    id="max-posts-per-day"
                    type="number"
                    value={config?.max_posts_per_day || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, max_posts_per_day: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('max_posts_per_day', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-posts-per-batch">Max Posts Per Batch</Label>
                  <Input
                    id="max-posts-per-batch"
                    type="number"
                    value={config?.max_posts_per_batch || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, max_posts_per_batch: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('max_posts_per_batch', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="articles-per-site">Articles Per Site</Label>
                  <Input
                    id="articles-per-site"
                    type="number"
                    value={config?.articles_per_site || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, articles_per_site: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('articles_per_site', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posting-schedule">Posting Schedule (Cron)</Label>
                  <Input
                    id="posting-schedule"
                    value={config?.posting_schedule || ''}
                    onChange={(e) => setConfig(prev => prev ? {...prev, posting_schedule: e.target.value} : null)}
                    onBlur={(e) => handleConfigUpdate('posting_schedule', e.target.value)}
                    placeholder="0 */6 * * *"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="websites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Website</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-website-name">Name</Label>
                  <Input
                    id="new-website-name"
                    value={newWebsite.name}
                    onChange={(e) => setNewWebsite(prev => ({...prev, name: e.target.value}))}
                    placeholder="Site Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-website-url">URL</Label>
                  <Input
                    id="new-website-url"
                    value={newWebsite.url}
                    onChange={(e) => setNewWebsite(prev => ({...prev, url: e.target.value}))}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-website-enabled">Enabled</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="new-website-enabled"
                      checked={newWebsite.enabled}
                      onCheckedChange={(checked) => setNewWebsite(prev => ({...prev, enabled: checked}))}
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleAddWebsite} disabled={!newWebsite.name || !newWebsite.url}>
                Add Website
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Website Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {websites.map((website) => (
                  <div key={website.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{website.name}</div>
                      <div className="text-sm text-gray-500">{website.url}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={website.enabled}
                        onCheckedChange={(checked) => handleUpdateWebsite(website.id, { enabled: checked })}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteWebsite(website.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Posting History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                          {item.platform}
                        </Badge>
                        <span className="text-sm">{item.status}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(item.posted_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutoPosterDashboard;
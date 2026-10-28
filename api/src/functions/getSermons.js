const { app } = require('@azure/functions');

const CHANNEL_ID = 'UCGBlzLVOerd5-0Gyu1Vx7Ew';
// Every channel's "uploads" playlist ID is its channel ID with the UC prefix swapped for UU.
const UPLOADS_PLAYLIST_ID = `UU${CHANNEL_ID.slice(2)}`;
const MAX_SERMONS = 10;

app.http('getSermons', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sermons',
  handler: async (_request, context) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      context.error('YOUTUBE_API_KEY is not configured');
      return { status: 500, jsonBody: { error: 'Sermons API is not configured' } };
    }

    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('playlistId', UPLOADS_PLAYLIST_ID);
      url.searchParams.set('maxResults', String(MAX_SERMONS));
      url.searchParams.set('key', apiKey);

      const response = await fetch(url);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`YouTube API returned ${response.status}: ${body}`);
      }

      const data = await response.json();
      const sermons = (data.items || [])
        .map((item) => ({
          videoId: item.snippet?.resourceId?.videoId,
          title: item.snippet?.title,
        }))
        .filter((sermon) => sermon.videoId && sermon.title);

      if (sermons.length === 0) throw new Error('No sermons found');

      return {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=3600' },
        jsonBody: { sermons },
      };
    } catch (err) {
      context.error('Failed to fetch sermons from YouTube API:', err);
      return { status: 502, jsonBody: { error: 'Failed to fetch latest sermons' } };
    }
  },
});

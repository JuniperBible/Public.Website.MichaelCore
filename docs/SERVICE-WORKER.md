# Service Worker Implementation

This document describes the offline support implementation for the Michael Bible Module using Service Workers.

## Overview

The service worker provides offline functionality with intelligent caching strategies:

- **Cache-first** for static assets (CSS, JS, fonts)
- **Network-first with cache fallback** for Bible chapter pages
- **Offline fallback page** when network fails and no cache exists

## Files Created

### 1. `/static/sw.js`
The main service worker script that handles:
- Pre-caching of shell assets and default chapters
- Request interception and caching strategies
- Cache version management
- Cleanup of old caches

**Key Features:**

- Cache versioning with `CACHE_VERSION` constant
- Two separate caches: `michael-shell-v1` and `michael-chapters-v1`
- Pre-caches 4 default chapters (Genesis 1, Psalm 23, Matthew 1, John 1)
- Intelligent routing based on URL patterns
- Comprehensive error handling and logging

### 2. `/static/offline.html`
Standalone offline fallback page that works without external resources.

**Key Features:**

- Inline CSS (no external stylesheets needed)
- Dark mode support via CSS media queries
- Lists all cached Bible chapters dynamically
- Connection status indicator
- Retry button to check connectivity
- Auto-reload when connection is restored

### 3. `/layouts/partials/michael/sw-register.html`
Hugo partial that registers the service worker in the browser.

**Key Features:**

- Feature detection for service worker support
- Environment-aware registration (production only by default)
- Update detection and notification
- User-friendly update banner
- Message handling for SW communication
- Comprehensive error handling

### 4. `/layouts/_default/baseof.html`
Updated to include the service worker registration partial before `</body>`.

## Caching Strategy

### Shell Assets (Cache-First)
Static resources that rarely change:
- Home page (`/`)
- Offline fallback page
- JavaScript files (bible-api.js, dom-utils.js, share-menu.js, share.js, strongs.js)
- CSS files (automatically cached when loaded)

**Strategy:** Check cache first, fall back to network if not found, then cache the response.

### Chapter Pages (Network-First)
Bible chapter pages (`/bible/{bible}/{book}/{chapter}/`):
- Try network first for fresh content
- Fall back to cache if network fails
- Cache successful responses for offline use

**Strategy:** Try network first, cache the response, fall back to cache if network fails.

### Offline Fallback
When both network and cache fail for navigation requests:
- Show `/offline.html` with list of cached content
- Display connection status
- Provide retry button

## Default Pre-Cached Chapters

The service worker pre-caches these chapters for offline reading:

1. **Genesis 1** (`/bible/kjva/gen/1/`) - Creation account
2. **Psalm 23** (`/bible/kjva/ps/23/`) - The Lord is my shepherd
3. **Matthew 1** (`/bible/kjva/matt/1/`) - Genealogy of Jesus
4. **John 1** (`/bible/kjva/john/1/`) - In the beginning was the Word

These were chosen as commonly read passages that provide value when offline.

## Environment Configuration

### Production (Default)
Service worker is **enabled** by default in production:

```bash
HUGO_ENVIRONMENT=production hugo
```

### Development (Default)
Service worker is **disabled** by default in development to avoid caching issues during development.

### Enable in Development
To test the service worker in development, add to `hugo.toml`:

```toml
[params.michael]
  enableSW = true
```

Then run:
```bash
hugo server
```

## Testing the Service Worker

### 1. Build for Production
```bash
HUGO_ENVIRONMENT=production hugo
```

### 2. Serve Locally
You need a local HTTP server (service workers require HTTPS or localhost):

```bash
# Option 1: Python
cd public && python3 -m http.server 8000

# Option 2: Node.js http-server
npx http-server public -p 8000

# Option 3: Hugo server (if enabled in config)
hugo server
```

### 3. Test Offline Functionality

1. **Open browser DevTools** (F12)
2. **Go to Application tab** → Service Workers
3. **Verify registration** - should see "activated and running"
4. **Check Cache Storage** - should see:
   - `michael-shell-v1` with shell assets
   - `michael-chapters-v1` with default chapters
5. **Test offline mode:**
   - Go to Network tab → Throttling → Offline
   - Navigate to `/bible/kjva/gen/1/` - should load from cache
   - Navigate to an uncached page - should show offline.html

### 4. Test Update Detection

1. **Change `CACHE_VERSION` in sw.js** (e.g., from '1' to '2')
2. **Reload the page**
3. **Should see update banner** in bottom-right corner
4. **Click "Reload"** to activate new service worker

## Console Logging

The service worker provides detailed console logging:

```
[SW] Script loaded
[Service Worker] Installing...
[Service Worker] Caching shell assets
[Service Worker] Cached: /
[Service Worker] Cached: /offline.html
[Service Worker] Caching default chapters
[Service Worker] Cached: /bible/kjva/gen/1/
[Service Worker] Installation complete
[Service Worker] Activating...
[Service Worker] Activation complete
[SW] Registration successful. Scope: /
```

## Cache Management

### Cache Names

- **Shell cache:** `michael-shell-v${CACHE_VERSION}`
- **Chapters cache:** `michael-chapters-v${CACHE_VERSION}`

### Cache Versioning
To force cache refresh (e.g., after major updates):

1. **Increment CACHE_VERSION** in `/static/sw.js`:
   ```javascript
   const CACHE_VERSION = '2'; // was '1'
   ```

2. **Old caches automatically deleted** on activation

### Manual Cache Clearing
Users can clear caches via browser DevTools:
- Application → Cache Storage → Delete

## Security Considerations

### Content Security Policy (CSP)
The service worker requires `script-src 'self'` to register and run. The current CSP in `baseof.html` already allows this.

### Scope
Service worker scope is `/` (root), meaning it can intercept all requests on the site.

### HTTPS Requirement
Service workers require HTTPS in production (except localhost for development).

## Customization

### Adding More Pre-Cached Chapters

Edit `/static/sw.js`:

```javascript
const DEFAULT_CHAPTERS = [
  '/bible/kjva/gen/1/',
  '/bible/kjva/ps/23/',
  '/bible/kjva/matt/1/',
  '/bible/kjva/john/1/',
  '/bible/kjva/john/3/',      // Add new chapters here
  '/bible/kjva/rom/8/',
];
```

### Changing Cache Strategy

Edit the `fetch` event listener in `/static/sw.js` to change strategies for different URL patterns.

### Customizing Offline Page

Edit `/static/offline.html` to match your site's branding and messaging.

### Disabling Update Notifications

Users can disable update notifications by setting localStorage:

```javascript
localStorage.setItem('sw-show-update-notification', 'false');
```

## Troubleshooting

### Service Worker Not Registering

**Check:**

1. Are you in production mode or is `params.michael.enableSW = true`?
2. Is the browser on localhost or HTTPS?
3. Does browser support service workers? (Check console)

### Offline Page Not Showing

**Check:**

1. Is `/offline.html` in the shell cache?
2. Was the service worker installed successfully?
3. Check browser DevTools → Application → Cache Storage

### Old Content Being Served

**Solution:**

1. Increment `CACHE_VERSION` in `sw.js`
2. Reload page to install new service worker
3. Click "Reload" on update banner

### Cache Too Large

**Consider:**

1. Reduce number of pre-cached chapters
2. Remove unused shell assets
3. Implement cache size limits

## Browser Support

Service workers are supported in:
- ✅ Chrome 40+
- ✅ Firefox 44+
- ✅ Safari 11.1+
- ✅ Edge 17+
- ❌ Internet Explorer (not supported)

The registration script includes feature detection, so unsupported browsers simply don't register the service worker (graceful degradation).

## Performance Impact

### Initial Load

- **Service worker script:** ~10KB
- **Registration overhead:** Minimal (async)
- **No impact on first page load**

### Subsequent Loads

- **Cache-first assets:** Instant (no network request)
- **Network-first pages:** Slightly slower (cache fallback adds overhead)
- **Overall:** Faster experience due to caching

### Storage

- **Shell cache:** ~50KB
- **Default chapters:** ~200KB (4 chapters)
- **Total initial:** ~250KB
- **Growth:** Increases as user browses (chapters cached on demand)

## Future Enhancements

Possible improvements:

1. **Background Sync** - Sync reading progress when back online
2. **Push Notifications** - Daily verse notifications
3. **Selective Caching** - Let users choose which chapters to cache
4. **Cache Limits** - Implement LRU cache eviction
5. **Offline Search** - Cache search index for offline search
6. **Reading Stats** - Track offline reading time

## References

- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Offline Cookbook - Google](https://web.dev/offline-cookbook/)
- [Workbox - Google's SW Library](https://developers.google.com/web/tools/workbox)

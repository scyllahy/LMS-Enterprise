const AppCache = Object.freeze({
  remember(scope, key, seconds, loader) {
    const cache = CacheService.getScriptCache(), version = cache.get('rev:' + scope) || '0';
    const cacheKey = ['lms', scope, version, key || 'all'].join(':').slice(0, 240);
    try {
      const hit = cache.get(cacheKey);
      if (hit !== null) return JSON.parse(hit);
    } catch (e) {}
    const value = loader();
    try { cache.put(cacheKey, JSON.stringify(value), Math.min(Math.max(seconds || 60, 1), 21600)); } catch (e) {}
    return value;
  },
  invalidate() {
    const cache = CacheService.getScriptCache(), scopes = Array.prototype.slice.call(arguments);
    scopes.forEach(scope => cache.put('rev:' + scope, String(Date.now()), 21600));
  }
});

function invalidateCachesForAction_(action) {
  const scopes = {
    'academic-year.add': ['academic-years'],
    'class.create': ['academic-years', 'classes'],
    'class.update': ['academic-years', 'classes'],
    'class.delete': ['academic-years', 'classes'],
    'subject.create': ['academic-years', 'subjects'],
    'subject.update': ['academic-years', 'subjects'],
    'user.create': ['teachers', 'subjects'],
    'user.status': ['teachers', 'subjects'],
    'quiz.create': ['academic-years'],
    'quiz.clone': ['academic-years']
    ,'quiz.delete': ['academic-years']
  }[action];
  if (scopes) AppCache.invalidate.apply(AppCache, scopes);
}

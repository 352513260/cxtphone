// Service Worker for EPhone PWA
// Version: 1.3.0

const CACHE_NAME = 'ephone-v1.3.0';
const STATIC_CACHE_NAME = 'ephone-static-v1.3.0';
const DYNAMIC_CACHE_NAME = 'ephone-dynamic-v1.3.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://i.postimg.cc/28p9L8FY/sogou20250606-073214826037-png.png'
];

// 需要缓存的动态资源（API等）
const DYNAMIC_PATTERNS = [
  /^https:\/\/unpkg\.com\//,
  /^https:\/\/cdnjs\.cloudflare\.com\//,
  /^https:\/\/fonts\.googleapis\.com\//,
  /^https:\/\/fonts\.gstatic\.com\//
];

// 安装事件
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 删除旧版本的缓存
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 处理同源请求
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            console.log('Service Worker: Serving from cache:', request.url);
            return response;
          }
          
          // 如果缓存中没有，从网络获取
          return fetch(request)
            .then(response => {
              // 检查响应是否有效
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // 克隆响应（因为响应只能使用一次）
              const responseToCache = response.clone();
              
              // 将响应添加到缓存
              caches.open(STATIC_CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
              
              return response;
            })
            .catch(error => {
              console.error('Service Worker: Fetch failed:', error);
              // 如果是页面请求且失败，返回离线页面
              if (request.destination === 'document') {
                return caches.match('./index.html');
              }
              throw error;
            });
        })
    );
  }
  
  // 处理外部资源请求
  else if (DYNAMIC_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME)
        .then(cache => {
          return cache.match(request)
            .then(response => {
              if (response) {
                console.log('Service Worker: Serving external resource from cache:', request.url);
                return response;
              }
              
              return fetch(request)
                .then(response => {
                  if (response && response.status === 200) {
                    cache.put(request, response.clone());
                  }
                  return response;
                })
                .catch(error => {
                  console.error('Service Worker: External resource fetch failed:', error);
                  throw error;
                });
            });
        })
    );
  }
});

// 处理后台同步
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 在这里处理后台同步逻辑
      console.log('Service Worker: Processing background sync')
    );
  }
});

// 处理推送通知
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : '您有新的消息',
    icon: './icon-192x192.png',
    badge: './icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看消息',
        icon: './icon-192x192.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: './icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('EPhone', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./index.html')
    );
  }
});

// 处理消息
self.addEventListener('message', event => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 错误处理
self.addEventListener('error', event => {
  console.error('Service Worker: Error occurred:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker: Unhandled promise rejection:', event.reason);
});

console.log('Service Worker: Script loaded successfully');

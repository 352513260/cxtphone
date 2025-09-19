// Service Worker for EPhone PWA
const CACHE_NAME = 'ephone-v1.0.0';
const STATIC_CACHE_NAME = 'ephone-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'ephone-dynamic-v1.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://i.postimg.cc/28p9L8FY/sogou20250606-073214826037-png.png'
];

// 需要缓存的动态资源模式
const DYNAMIC_PATTERNS = [
  /^https:\/\/i\.postimg\.cc\//,
  /^https:\/\/files\.catbox\.moe\//,
  /^https:\/\/fonts\.googleapis\.com\//,
  /^https:\/\/fonts\.gstatic\.com\//
];

// 安装事件
self.addEventListener('install', event => {
  console.log('Service Worker: 安装中...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: 安装完成');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: 安装失败', error);
      })
  );
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('Service Worker: 激活中...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 删除旧版本的缓存
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: 删除旧缓存', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: 激活完成');
        return self.clients.claim();
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理GET请求
  if (request.method !== 'GET') {
    return;
  }
  
  // 处理同源请求
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            console.log('Service Worker: 从缓存返回', request.url);
            return response;
          }
          
          return fetch(request)
            .then(response => {
              // 缓存成功的响应
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then(cache => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(error => {
              console.error('Service Worker: 网络请求失败', error);
              // 返回离线页面或默认响应
              if (request.destination === 'document') {
                return caches.match('./index.html');
              }
            });
        })
    );
  }
  
  // 处理外部资源请求（图片、字体等）
  else if (isDynamicResource(url.href)) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            console.log('Service Worker: 从缓存返回外部资源', request.url);
            return response;
          }
          
          return fetch(request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE_NAME)
                  .then(cache => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(error => {
              console.error('Service Worker: 外部资源请求失败', error);
              // 返回默认图片或空响应
              if (request.destination === 'image') {
                return new Response('', {
                  status: 404,
                  statusText: 'Not Found'
                });
              }
            });
        })
    );
  }
});

// 检查是否为动态资源
function isDynamicResource(url) {
  return DYNAMIC_PATTERNS.some(pattern => pattern.test(url));
}

// 处理后台同步
self.addEventListener('sync', event => {
  console.log('Service Worker: 后台同步', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 这里可以添加后台同步逻辑
      console.log('执行后台同步任务')
    );
  }
});

// 处理推送通知
self.addEventListener('push', event => {
  console.log('Service Worker: 收到推送通知');
  
  const options = {
    body: event.data ? event.data.text() : '您有新的消息',
    icon: 'https://i.postimg.cc/28p9L8FY/sogou20250606-073214826037-png.png',
    badge: 'https://i.postimg.cc/28p9L8FY/sogou20250606-073214826037-png.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看',
        icon: 'https://i.postimg.cc/28p9L8FY/sogou20250606-073214826037-png.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: 'https://i.postimg.cc/28p9L8FY/sogou20250606-073214826037-png.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('EPhone', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: 通知被点击', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./index.html')
    );
  }
});

// 处理消息
self.addEventListener('message', event => {
  console.log('Service Worker: 收到消息', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 错误处理
self.addEventListener('error', event => {
  console.error('Service Worker: 发生错误', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker: 未处理的Promise拒绝', event.reason);
});

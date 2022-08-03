var APP_NAME = 'IVS';
var APP_VER = '1.1';
var CACHE_NAME = APP_NAME + '-' + APP_VER;
var APP_ROOT = '/';
var REQUIRED_FILES = [
    APP_ROOT + 'assets/css/style.css',
    APP_ROOT + 'assets/js/main.js',
    APP_ROOT + 'assets/js/app-version.js',
];
var APP_DIAG = false;
self['addEventListener']('install', function (event) {
    event['waitUntil'](caches['open'](CACHE_NAME)['then'](function (cacheName) {
        return cacheName['addAll'](REQUIRED_FILES)
    })['catch'](function (fileName) {
        if (APP_DIAG) {
            console['log']('Service Worker Cache: Error Check REQUIRED_FILES array in _service-worker.js - files are missing or path to files is incorrectly written -  ' + fileName)
        }
    })['then'](function () {
        return self['skipWaiting']()
    })['then'](function () {
        if (APP_DIAG) {
            console['log']('Service Worker: Cache is OK')
        }
    }));
    if (APP_DIAG) {
        console['log']('Service Worker: Installed')
    }
});
self['addEventListener']('fetch', function (event) {
    event['respondWith'](caches['match'](event['request'])['then'](function (fetched) {
        if (fetched) {
            return fetched
        };
        return fetch(event['request'])
    }));
    if (APP_DIAG) {
        console['log']('Service Worker: Fetching ' + APP_NAME + '-' + APP_VER + ' files from Cache')
    }
});
self['addEventListener']('activate', function (event) {
    event['waitUntil'](self['clients']['claim']());
    event['waitUntil'](caches['keys']()['then']((cacheName) => {
        return Promise['all'](cacheName['filter']((filter) => {
            return (filter['startsWith'](APP_NAME + '-'))
        })['filter']((filter) => {
            return (filter !== CACHE_NAME)
        })['map']((filter) => {
            return caches['delete'](filter)
        }))
    }));
    if (APP_DIAG) {
        console['log']('Service Worker: Activated')
    }
})
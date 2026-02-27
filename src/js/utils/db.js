/**
 * db.js — Wrapper IndexedDB para Transcriptor Pro
 * ─────────────────────────────────────────────────
 * Expone window.appDB con API asíncrona equivalente a localStorage.
 * Incluye:
 *   • Migración automática desde localStorage al primer uso
 *   • Fallback transparente a localStorage si IndexedDB no está disponible
 *   • Clave `theme` mantenida en localStorage para que CSS la lea sync
 *
 * Debe cargarse PRIMERO en index.html y en build.js (primer elemento de JS_FILES).
 */

(function () {
    'use strict';

    const DB_NAME    = 'TranscriptorProDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'appData';
    const THEME_KEY  = 'theme';              // única clave que CSS lee sync
    const MIGRATED_FLAG = '_idb_migrated';  // flag para saber si ya migramos

    // ── helpers internos ──────────────────────────────────────────────────────

    /** Abre (o crea) la BD. Devuelve Promise<IDBDatabase>. */
    function openDB() {
        return new Promise(function (resolve, reject) {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            req.onsuccess = function (e) { resolve(e.target.result); };
            req.onerror   = function (e) { reject(e.target.error);   };
        });
    }

    /** Ejecuta una transacción sobre el store y devuelve Promise<result>. */
    function tx(db, mode, callback) {
        return new Promise(function (resolve, reject) {
            const transaction = db.transaction([STORE_NAME], mode);
            const store = transaction.objectStore(STORE_NAME);
            const req = callback(store);
            if (req) {
                req.onsuccess = function (e) { resolve(e.target.result); };
                req.onerror   = function (e) { reject(e.target.error);   };
            } else {
                transaction.oncomplete = function () { resolve(); };
                transaction.onerror    = function (e) { reject(e.target.error); };
            }
        });
    }

    // ── implementación localStorage fallback ─────────────────────────────────

    const lsFallback = {
        get: function (key) {
            try {
                const raw = localStorage.getItem(key);
                if (raw === null) return Promise.resolve(undefined);
                return Promise.resolve(JSON.parse(raw));
            } catch (e) {
                return Promise.resolve(undefined);
            }
        },
        set: function (key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                // sync theme en localStorage
                if (key === THEME_KEY) {
                    /* ya está en localStorage */
                }
            } catch (e) {/* silencioso */}
            return Promise.resolve();
        },
        remove: function (key) {
            try { localStorage.removeItem(key); } catch (e) {/* silencioso */}
            return Promise.resolve();
        },
        clear: function () {
            try { localStorage.clear(); } catch (e) {/* silencioso */}
            return Promise.resolve();
        },
        keys: function () {
            try {
                return Promise.resolve(Object.keys(localStorage));
            } catch (e) {
                return Promise.resolve([]);
            }
        },
        getAll: function () {
            const result = {};
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    try { result[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { result[k] = localStorage.getItem(k); }
                }
            } catch (e) {/* silencioso */}
            return Promise.resolve(result);
        },
        sizeInBytes: function () {
            let total = 0;
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    total += (k + localStorage.getItem(k)).length * 2;
                }
            } catch (e) {/* silencioso */}
            return Promise.resolve(total);
        }
    };

    // ── implementación IndexedDB principal ───────────────────────────────────

    function buildIDBImpl(db) {
        return {
            get: function (key) {
                return tx(db, 'readonly', function (store) {
                    return store.get(key);
                });
            },
            set: function (key, value) {
                // Si es theme, también mantener en localStorage para CSS
                if (key === THEME_KEY) {
                    try { localStorage.setItem(THEME_KEY, value); } catch (e) {/* silencioso */}
                }
                return tx(db, 'readwrite', function (store) {
                    return store.put(value, key);
                });
            },
            remove: function (key) {
                if (key === THEME_KEY) {
                    try { localStorage.removeItem(THEME_KEY); } catch (e) {/* silencioso */}
                }
                return tx(db, 'readwrite', function (store) {
                    return store.delete(key);
                });
            },
            clear: function () {
                // Preservar theme en localStorage
                let themeVal;
                try { themeVal = localStorage.getItem(THEME_KEY); } catch (e) { themeVal = null; }
                return tx(db, 'readwrite', function (store) {
                    return store.clear();
                }).then(function () {
                    if (themeVal !== null) {
                        try { localStorage.setItem(THEME_KEY, themeVal); } catch (e) {/* silencioso */}
                    }
                });
            },
            keys: function () {
                return new Promise(function (resolve, reject) {
                    const transaction = db.transaction([STORE_NAME], 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const req = store.getAllKeys();
                    req.onsuccess = function (e) { resolve(e.target.result); };
                    req.onerror   = function (e) { reject(e.target.error);   };
                });
            },
            getAll: function () {
                var self = this;
                return self.keys().then(function (keys) {
                    return new Promise(function (resolve, reject) {
                        const transaction = db.transaction([STORE_NAME], 'readonly');
                        const store = transaction.objectStore(STORE_NAME);
                        const result = {};
                        let pending = keys.length;
                        if (pending === 0) { resolve(result); return; }
                        keys.forEach(function (k) {
                            const req = store.get(k);
                            req.onsuccess = function (e) {
                                result[k] = e.target.result;
                                if (--pending === 0) resolve(result);
                            };
                            req.onerror = function (e) { reject(e.target.error); };
                        });
                    });
                });
            },
            sizeInBytes: function () {
                var self = this;
                return self.getAll().then(function (all) {
                    let total = 0;
                    Object.keys(all).forEach(function (k) {
                        try {
                            total += k.length * 2;
                            total += JSON.stringify(all[k]).length * 2;
                        } catch (e) {/* silencioso */}
                    });
                    return total;
                });
            }
        };
    }

    // ── migración automática localStorage → IndexedDB ─────────────────────────

    function migrateFromLocalStorage(idbImpl) {
        // Verificar si ya migramos (el flag está en IDB)
        return idbImpl.get(MIGRATED_FLAG).then(function (alreadyMigrated) {
            if (alreadyMigrated) return; // ya migrado, nada que hacer

            // Leer todas las claves de localStorage
            const keysToMigrate = [];
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    keysToMigrate.push(localStorage.key(i));
                }
            } catch (e) { return; }

            if (keysToMigrate.length === 0) {
                // No hay datos en localStorage, solo marcar como migrado
                return idbImpl.set(MIGRATED_FLAG, true);
            }

            // Copiar todos los valores a IndexedDB
            const writes = keysToMigrate.map(function (k) {
                let value;
                try {
                    const raw = localStorage.getItem(k);
                    try { value = JSON.parse(raw); } catch (e) { value = raw; }
                } catch (e) { value = undefined; }
                return idbImpl.set(k, value);
            });

            return Promise.all(writes).then(function () {
                // Marcar migración completa
                return idbImpl.set(MIGRATED_FLAG, true);
            }).then(function () {
                // Limpiar localStorage excepto theme
                const themeVal = localStorage.getItem(THEME_KEY);
                try { localStorage.clear(); } catch (e) {/* silencioso */}
                if (themeVal !== null) {
                    try { localStorage.setItem(THEME_KEY, themeVal); } catch (e) {/* silencioso */}
                }
                console.log('[db.js] Migración localStorage → IndexedDB completada. ' + keysToMigrate.length + ' claves migradas.');
            });
        });
    }

    // ── inicialización ────────────────────────────────────────────────────────

    // Exponer un proxy síncrono temporal que encola llamadas antes de que IDB esté listo
    var _db = null;
    var _queue = [];

    function enqueue(method, args) {
        return new Promise(function (resolve, reject) {
            _queue.push({ method: method, args: args, resolve: resolve, reject: reject });
        });
    }

    // API pública — disponible inmediatamente, pero encola hasta que IDB esté listo
    window.appDB = {
        get:         function (key)        { return _db ? _db.get(key)         : enqueue('get',         [key]);        },
        set:         function (key, value) { return _db ? _db.set(key, value)  : enqueue('set',         [key, value]); },
        remove:      function (key)        { return _db ? _db.remove(key)      : enqueue('remove',      [key]);        },
        clear:       function ()           { return _db ? _db.clear()          : enqueue('clear',       []);           },
        keys:        function ()           { return _db ? _db.keys()           : enqueue('keys',        []);           },
        getAll:      function ()           { return _db ? _db.getAll()         : enqueue('getAll',      []);           },
        sizeInBytes: function ()           { return _db ? _db.sizeInBytes()    : enqueue('sizeInBytes', []);           }
    };

    // Intentar abrir IndexedDB
    if (typeof indexedDB === 'undefined' || !indexedDB) {
        // Fallback inmediato
        console.warn('[db.js] IndexedDB no disponible, usando localStorage como fallback.');
        _db = lsFallback;
        _queue.forEach(function (item) {
            _db[item.method].apply(_db, item.args).then(item.resolve).catch(item.reject);
        });
        _queue = [];
    } else {
        openDB().then(function (db) {
            const impl = buildIDBImpl(db);
            return migrateFromLocalStorage(impl).then(function () {
                return impl;
            });
        }).then(function (impl) {
            _db = impl;
            // Resolver la cola acumulada
            _queue.forEach(function (item) {
                _db[item.method].apply(_db, item.args).then(item.resolve).catch(item.reject);
            });
            _queue = [];
            console.log('[db.js] IndexedDB listo ✓');
        }).catch(function (err) {
            console.warn('[db.js] Error abriendo IndexedDB, usando fallback localStorage.', err);
            _db = lsFallback;
            _queue.forEach(function (item) {
                _db[item.method].apply(_db, item.args).then(item.resolve).catch(item.reject);
            });
            _queue = [];
        });
    }

})();

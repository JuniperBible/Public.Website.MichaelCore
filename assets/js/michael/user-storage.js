/**
 * Michael User Storage Module
 *
 * IndexedDB storage for user data including:
 * - Reading progress (last chapter, scroll position)
 * - Bookmarks
 * - Notes/highlights
 * - User preferences
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

window.Michael = window.Michael || {};
window.Michael.UserStorage = (function() {
  'use strict';

  const DB_NAME = 'michael-user-data';
  const DB_VERSION = 1;

  // Store names
  const STORES = {
    PROGRESS: 'reading-progress',
    BOOKMARKS: 'bookmarks',
    NOTES: 'notes',
    SETTINGS: 'settings'
  };

  /**
   * Database instance
   * @private
   * @type {IDBDatabase|null}
   */
  let db = null;

  /**
   * Initializes the IndexedDB database.
   *
   * @returns {Promise<void>}
   *
   * @example
   * await UserStorage.init();
   * console.log('Database ready');
   */
  async function init() {
    if (db) {
      return; // Already initialized
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[UserStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log('[UserStorage] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // Create reading progress store
        // Key: bibleId (e.g., "kjv")
        if (!database.objectStoreNames.contains(STORES.PROGRESS)) {
          const progressStore = database.createObjectStore(STORES.PROGRESS, { keyPath: 'bibleId' });
          progressStore.createIndex('lastRead', 'lastRead', { unique: false });
        }

        // Create bookmarks store
        // Key: auto-increment id
        if (!database.objectStoreNames.contains(STORES.BOOKMARKS)) {
          const bookmarksStore = database.createObjectStore(STORES.BOOKMARKS, { keyPath: 'id', autoIncrement: true });
          bookmarksStore.createIndex('reference', 'reference', { unique: false });
          bookmarksStore.createIndex('bibleId', 'bibleId', { unique: false });
          bookmarksStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create notes store
        // Key: auto-increment id
        if (!database.objectStoreNames.contains(STORES.NOTES)) {
          const notesStore = database.createObjectStore(STORES.NOTES, { keyPath: 'id', autoIncrement: true });
          notesStore.createIndex('reference', 'reference', { unique: false });
          notesStore.createIndex('bibleId', 'bibleId', { unique: false });
          notesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create settings store
        // Key: setting key name
        if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
          database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        console.log('[UserStorage] Database upgraded to version', DB_VERSION);
      };
    });
  }

  /**
   * Ensures the database is initialized before performing operations.
   *
   * @private
   * @returns {Promise<IDBDatabase>}
   */
  async function ensureDB() {
    if (!db) {
      await init();
    }
    return db;
  }

  // ============================================
  // Reading Progress
  // ============================================

  /**
   * Saves reading progress for a Bible.
   *
   * @param {string} bibleId - Bible translation ID
   * @param {string} bookId - Book ID (e.g., "gen", "matt")
   * @param {number} chapter - Chapter number
   * @param {number} [scrollPos=0] - Scroll position
   * @returns {Promise<void>}
   *
   * @example
   * await UserStorage.saveProgress('kjv', 'gen', 1, 250);
   */
  async function saveProgress(bibleId, bookId, chapter, scrollPos = 0) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.PROGRESS], 'readwrite');
      const store = transaction.objectStore(STORES.PROGRESS);

      const data = {
        bibleId,
        bookId,
        chapter,
        scrollPos,
        lastRead: Date.now()
      };

      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Gets reading progress for a specific Bible.
   *
   * @param {string} bibleId - Bible translation ID
   * @returns {Promise<{bibleId: string, bookId: string, chapter: number, scrollPos: number, lastRead: number}|null>}
   *
   * @example
   * const progress = await UserStorage.getProgress('kjv');
   * if (progress) {
   *   console.log(`Last read: ${progress.bookId} ${progress.chapter}`);
   * }
   */
  async function getProgress(bibleId) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.PROGRESS], 'readonly');
      const store = transaction.objectStore(STORES.PROGRESS);

      const request = store.get(bibleId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Gets the most recently read Bible and location.
   *
   * @returns {Promise<{bibleId: string, bookId: string, chapter: number, scrollPos: number, lastRead: number}|null>}
   *
   * @example
   * const lastRead = await UserStorage.getLastRead();
   * if (lastRead) {
   *   window.location.href = `/bible/${lastRead.bibleId}/${lastRead.bookId}/${lastRead.chapter}/`;
   * }
   */
  async function getLastRead() {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.PROGRESS], 'readonly');
      const store = transaction.objectStore(STORES.PROGRESS);
      const index = store.index('lastRead');

      const request = index.openCursor(null, 'prev'); // Get most recent

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
    });
  }

  /**
   * Gets all reading progress entries.
   *
   * @returns {Promise<Array>}
   */
  async function getAllProgress() {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.PROGRESS], 'readonly');
      const store = transaction.objectStore(STORES.PROGRESS);

      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // ============================================
  // Bookmarks
  // ============================================

  /**
   * Adds a bookmark.
   *
   * @param {string} bibleId - Bible translation ID
   * @param {string} reference - Scripture reference (e.g., "John 3:16")
   * @param {string} [note=''] - Optional note
   * @returns {Promise<number>} The bookmark ID
   *
   * @example
   * const id = await UserStorage.addBookmark('kjv', 'John 3:16', 'Great verse');
   */
  async function addBookmark(bibleId, reference, note = '') {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.BOOKMARKS], 'readwrite');
      const store = transaction.objectStore(STORES.BOOKMARKS);

      const data = {
        bibleId,
        reference,
        note,
        createdAt: Date.now()
      };

      const request = store.add(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Gets all bookmarks, optionally filtered by Bible.
   *
   * @param {string} [bibleId] - Optional Bible ID to filter by
   * @returns {Promise<Array<{id: number, bibleId: string, reference: string, note: string, createdAt: number}>>}
   *
   * @example
   * const bookmarks = await UserStorage.getBookmarks('kjv');
   */
  async function getBookmarks(bibleId) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.BOOKMARKS], 'readonly');
      const store = transaction.objectStore(STORES.BOOKMARKS);

      let request;
      if (bibleId) {
        const index = store.index('bibleId');
        request = index.getAll(bibleId);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Removes a bookmark by ID.
   *
   * @param {number} id - Bookmark ID
   * @returns {Promise<void>}
   *
   * @example
   * await UserStorage.removeBookmark(123);
   */
  async function removeBookmark(id) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.BOOKMARKS], 'readwrite');
      const store = transaction.objectStore(STORES.BOOKMARKS);

      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ============================================
  // Notes
  // ============================================

  /**
   * Adds a note to a verse or passage.
   *
   * @param {string} bibleId - Bible translation ID
   * @param {string} reference - Scripture reference
   * @param {string} content - Note content
   * @param {string} [highlightColor] - Optional highlight color
   * @returns {Promise<number>} The note ID
   *
   * @example
   * const id = await UserStorage.addNote('kjv', 'Rom 8:28', 'God works all things...', '#ffff00');
   */
  async function addNote(bibleId, reference, content, highlightColor) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.NOTES], 'readwrite');
      const store = transaction.objectStore(STORES.NOTES);

      const data = {
        bibleId,
        reference,
        content,
        highlightColor: highlightColor || null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const request = store.add(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Updates an existing note.
   *
   * @param {number} id - Note ID
   * @param {Object} updates - Fields to update
   * @param {string} [updates.content] - New content
   * @param {string} [updates.highlightColor] - New highlight color
   * @returns {Promise<void>}
   */
  async function updateNote(id, updates) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.NOTES], 'readwrite');
      const store = transaction.objectStore(STORES.NOTES);

      const getRequest = store.get(id);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const note = getRequest.result;
        if (!note) {
          reject(new Error('Note not found'));
          return;
        }

        const updatedNote = {
          ...note,
          ...updates,
          updatedAt: Date.now()
        };

        const putRequest = store.put(updatedNote);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  /**
   * Gets notes for a specific reference.
   *
   * @param {string} bibleId - Bible translation ID
   * @param {string} reference - Scripture reference
   * @returns {Promise<Array>}
   *
   * @example
   * const notes = await UserStorage.getNotes('kjv', 'John 3:16');
   */
  async function getNotes(bibleId, reference) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.NOTES], 'readonly');
      const store = transaction.objectStore(STORES.NOTES);
      const index = store.index('reference');

      const request = index.getAll(reference);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result || [];
        // Filter by bibleId if specified
        if (bibleId) {
          resolve(results.filter(n => n.bibleId === bibleId));
        } else {
          resolve(results);
        }
      };
    });
  }

  /**
   * Gets all notes, optionally filtered by Bible.
   *
   * @param {string} [bibleId] - Optional Bible ID to filter by
   * @returns {Promise<Array>}
   */
  async function getAllNotes(bibleId) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.NOTES], 'readonly');
      const store = transaction.objectStore(STORES.NOTES);

      let request;
      if (bibleId) {
        const index = store.index('bibleId');
        request = index.getAll(bibleId);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Removes a note by ID.
   *
   * @param {number} id - Note ID
   * @returns {Promise<void>}
   */
  async function removeNote(id) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.NOTES], 'readwrite');
      const store = transaction.objectStore(STORES.NOTES);

      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ============================================
  // Settings/Preferences
  // ============================================

  /**
   * Sets a user preference/setting.
   *
   * @param {string} key - Setting key
   * @param {*} value - Setting value (any serializable type)
   * @returns {Promise<void>}
   *
   * @example
   * await UserStorage.setSetting('fontSize', 18);
   * await UserStorage.setSetting('darkMode', true);
   */
  async function setSetting(key, value) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);

      const request = store.put({ key, value, updatedAt: Date.now() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Gets a user preference/setting.
   *
   * @param {string} key - Setting key
   * @param {*} [defaultValue] - Default value if setting doesn't exist
   * @returns {Promise<*>}
   *
   * @example
   * const fontSize = await UserStorage.getSetting('fontSize', 16);
   */
  async function getSetting(key, defaultValue) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.SETTINGS], 'readonly');
      const store = transaction.objectStore(STORES.SETTINGS);

      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
    });
  }

  /**
   * Gets all settings.
   *
   * @returns {Promise<Object>} Object with all settings as key-value pairs
   */
  async function getAllSettings() {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.SETTINGS], 'readonly');
      const store = transaction.objectStore(STORES.SETTINGS);

      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result || [];
        const settings = {};
        results.forEach(item => {
          settings[item.key] = item.value;
        });
        resolve(settings);
      };
    });
  }

  /**
   * Removes a setting.
   *
   * @param {string} key - Setting key
   * @returns {Promise<void>}
   */
  async function removeSetting(key) {
    const database = await ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);

      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Clears all user data from all stores.
   *
   * @returns {Promise<void>}
   */
  async function clearAllData() {
    const database = await ensureDB();

    const storeNames = Object.values(STORES);

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeNames, 'readwrite');

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      storeNames.forEach(storeName => {
        transaction.objectStore(storeName).clear();
      });
    });
  }

  /**
   * Exports all user data as JSON.
   *
   * @returns {Promise<Object>}
   */
  async function exportData() {
    const [progress, bookmarks, notes, settings] = await Promise.all([
      getAllProgress(),
      getBookmarks(),
      getAllNotes(),
      getAllSettings()
    ]);

    return {
      version: DB_VERSION,
      exportedAt: Date.now(),
      progress,
      bookmarks,
      notes,
      settings
    };
  }

  /**
   * Checks if IndexedDB is supported.
   *
   * @returns {boolean}
   */
  function isSupported() {
    return 'indexedDB' in window;
  }

  // Public API
  return {
    init,
    isSupported,

    // Reading Progress
    saveProgress,
    getProgress,
    getLastRead,
    getAllProgress,

    // Bookmarks
    addBookmark,
    getBookmarks,
    removeBookmark,

    // Notes
    addNote,
    updateNote,
    getNotes,
    getAllNotes,
    removeNote,

    // Settings
    setSetting,
    getSetting,
    getAllSettings,
    removeSetting,

    // Utilities
    clearAllData,
    exportData
  };
})();

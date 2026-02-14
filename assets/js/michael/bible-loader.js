/**
 * Michael Bible Loader Module
 *
 * Loads Bible data from compressed XZ/Gzip/JSON archives and stores in IndexedDB.
 * This module provides fast access to verse data without HTML parsing.
 *
 * Features:
 * - XZ decompression (primary, best compression)
 * - Gzip decompression (secondary fallback, native browser support)
 * - JSON fallback (tertiary, maximum compatibility)
 * - IndexedDB storage for offline access
 * - Memory cache for current session
 * - Progress callbacks for UI updates
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

window.Michael = window.Michael || {};
window.Michael.BibleLoader = (function() {
  'use strict';

  const DB_NAME = 'JuniperBibleDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'bibles';
  const ARCHIVE_PATH = window.Michael?.Config?.archivePath || '/bible-archives';

  // Regex pattern for valid Bible IDs (alphanumeric, hyphen, underscore only)
  const VALID_BIBLE_ID = /^[A-Za-z0-9_-]+$/;

  /**
   * Validates a Bible ID to prevent path traversal and SSRF attacks.
   * @param {string} bibleId - Bible translation ID to validate
   * @returns {boolean} True if valid, false otherwise
   */
  function isValidBibleId(bibleId) {
    return typeof bibleId === 'string' &&
           bibleId.length > 0 &&
           bibleId.length <= 50 &&
           VALID_BIBLE_ID.test(bibleId);
  }

  // In-memory cache for loaded Bibles
  const memoryCache = new Map();

  // LZMA decompressor reference (lazy loaded)
  let lzmaLoaded = false;

  // IndexedDB instance
  let db = null;

  /**
   * Opens or creates the IndexedDB database.
   * @returns {Promise<IDBDatabase>}
   */
  async function openDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Loads the LZMA-JS decompression library if not already loaded.
   * @returns {Promise<void>}
   */
  async function loadLZMA() {
    if (lzmaLoaded || typeof LZMA !== 'undefined') {
      lzmaLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${ARCHIVE_PATH}/lzma-d.min.js`;
      script.onload = () => {
        lzmaLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load LZMA library'));
      document.head.appendChild(script);
    });
  }

  /**
   * Decompresses XZ data using LZMA-JS.
   * @param {ArrayBuffer} buffer - XZ compressed data
   * @returns {Promise<Object>} - Parsed JSON object
   */
  async function decompressXZ(buffer) {
    await loadLZMA();

    return new Promise((resolve, reject) => {
      try {
        const uint8 = new Uint8Array(buffer);
        const result = LZMA.decompress(uint8);

        // LZMA.decompress returns a string or Uint8Array
        let jsonStr;
        if (typeof result === 'string') {
          jsonStr = result;
        } else {
          jsonStr = new TextDecoder().decode(result);
        }

        resolve(JSON.parse(jsonStr));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Decompresses Gzip data using native DecompressionStream.
   * @param {Response} response - Fetch response with gzip body
   * @returns {Promise<Object>} - Parsed JSON object
   */
  async function decompressGzip(response) {
    const ds = new DecompressionStream('gzip');
    const decompressed = response.body.pipeThrough(ds);
    const text = await new Response(decompressed).text();
    return JSON.parse(text);
  }

  /**
   * Fetches and decompresses a Bible archive.
   * Tries XZ first, falls back to Gzip, then JSON.
   *
   * @param {string} bibleId - Bible translation ID (e.g., "kjva", "asv")
   * @param {function} [onProgress] - Progress callback (0-1)
   * @returns {Promise<Object>} - Bible data object
   */
  async function fetchBibleArchive(bibleId, onProgress) {
    // Validate bibleId to prevent path traversal and SSRF
    if (!isValidBibleId(bibleId)) {
      throw new Error(`Invalid Bible ID: ${bibleId}`);
    }

    // Try XZ first (better compression)
    try {
      if (onProgress) onProgress(0.1);

      const xzUrl = `${ARCHIVE_PATH}/xz/${bibleId}.json.xz`;
      const xzResponse = await fetch(xzUrl);

      if (xzResponse.ok) {
        if (onProgress) onProgress(0.5);
        const buffer = await xzResponse.arrayBuffer();

        if (onProgress) onProgress(0.7);
        const data = await decompressXZ(buffer);

        if (onProgress) onProgress(1);
        return data;
      }
    } catch (err) {
      console.warn('XZ decompression failed for %s, falling back to gzip:', bibleId, err.message);
    }

    // Fallback to Gzip (native browser support)
    try {
      if (onProgress) onProgress(0.3);

      const gzUrl = `${ARCHIVE_PATH}/gz/${bibleId}.json.gz`;
      const gzResponse = await fetch(gzUrl);

      if (gzResponse.ok) {
        if (onProgress) onProgress(0.6);
        const data = await decompressGzip(gzResponse);

        if (onProgress) onProgress(1);
        return data;
      }
    } catch (err) {
      console.warn('Gzip decompression failed for %s, falling back to JSON:', bibleId, err.message);
    }

    // Tertiary fallback: uncompressed JSON (maximum compatibility)
    try {
      if (onProgress) onProgress(0.5);

      const jsonUrl = `${ARCHIVE_PATH}/json/${bibleId}.json`;
      const jsonResponse = await fetch(jsonUrl);

      if (jsonResponse.ok) {
        if (onProgress) onProgress(1);
        return await jsonResponse.json();
      }

      throw new Error(`Failed to fetch ${bibleId}: ${jsonResponse.status}`);
    } catch (err) {
      console.error('All fallbacks failed for %s:', bibleId, err);
      throw new Error(`Failed to load Bible ${bibleId} from any source`);
    }
  }

  /**
   * Stores Bible data in IndexedDB.
   * @param {string} bibleId - Bible translation ID
   * @param {Object} data - Bible data object
   * @returns {Promise<void>}
   */
  async function storeBible(bibleId, data) {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = {
        id: bibleId,
        data: data,
        timestamp: Date.now()
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves Bible data from IndexedDB.
   * @param {string} bibleId - Bible translation ID
   * @returns {Promise<Object|null>} - Bible data or null if not found
   */
  async function getBibleFromDB(bibleId) {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(bibleId);

      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Checks if a Bible is stored in IndexedDB.
   * @param {string} bibleId - Bible translation ID
   * @returns {Promise<boolean>}
   */
  async function hasBibleInDB(bibleId) {
    const data = await getBibleFromDB(bibleId);
    return data !== null;
  }

  /**
   * Loads a Bible translation, using cache/IndexedDB or fetching from network.
   *
   * Priority:
   * 1. Memory cache (fastest, current session)
   * 2. IndexedDB (offline storage)
   * 3. Network fetch (XZ then Gzip)
   *
   * @param {string} bibleId - Bible translation ID (e.g., "kjva", "asv")
   * @param {Object} [options] - Options
   * @param {function} [options.onProgress] - Progress callback (0-1)
   * @param {boolean} [options.forceNetwork] - Skip cache, fetch from network
   * @returns {Promise<Object>} - Bible data object
   */
  async function loadBible(bibleId, options = {}) {
    const { onProgress, forceNetwork = false } = options;

    // Check memory cache first
    if (!forceNetwork && memoryCache.has(bibleId)) {
      if (onProgress) onProgress(1);
      return memoryCache.get(bibleId);
    }

    // Check IndexedDB
    if (!forceNetwork) {
      try {
        const dbData = await getBibleFromDB(bibleId);
        if (dbData) {
          memoryCache.set(bibleId, dbData);
          if (onProgress) onProgress(1);
          return dbData;
        }
      } catch (err) {
        console.warn('IndexedDB read failed:', err);
      }
    }

    // Fetch from network
    const data = await fetchBibleArchive(bibleId, onProgress);

    // Store in memory cache
    memoryCache.set(bibleId, data);

    // Store in IndexedDB (async, don't wait)
    storeBible(bibleId, data).catch(err => {
      console.warn('Failed to store Bible in IndexedDB:', err);
    });

    return data;
  }

  /**
   * Gets chapter data from a loaded Bible.
   *
   * @param {string} bibleId - Bible translation ID
   * @param {string} bookId - Book identifier (e.g., "Gen", "Matt")
   * @param {number} chapterNum - Chapter number (1-based)
   * @returns {Promise<Array<{number: number, text: string}>|null>}
   *          Array of verse objects, or null if not found
   */
  async function getChapter(bibleId, bookId, chapterNum) {
    try {
      const bible = await loadBible(bibleId);
      if (!bible || !bible.books) return null;

      // Find book (case-insensitive)
      const bookIdLower = bookId.toLowerCase();
      const book = bible.books.find(b => b.id.toLowerCase() === bookIdLower);
      if (!book) return null;

      // Find chapter
      const chapter = book.chapters.find(c => c.number === chapterNum);
      if (!chapter) return null;

      return chapter.verses;
    } catch (err) {
      console.error('Failed to get chapter %s/%s/%s:', bibleId, bookId, chapterNum, err);
      return null;
    }
  }

  /**
   * Gets book metadata from a loaded Bible.
   *
   * @param {string} bibleId - Bible translation ID
   * @returns {Promise<Array<{id: string, name: string, testament: string, chapterCount: number}>|null>}
   */
  async function getBooks(bibleId) {
    try {
      const bible = await loadBible(bibleId);
      if (!bible || !bible.books) return null;

      return bible.books.map(book => ({
        id: book.id,
        name: book.name,
        testament: book.testament,
        chapterCount: book.chapters.length
      }));
    } catch (err) {
      console.error('Failed to get books for %s:', bibleId, err);
      return null;
    }
  }

  /**
   * Clears the memory cache.
   */
  function clearMemoryCache() {
    memoryCache.clear();
  }

  /**
   * Deletes a Bible from IndexedDB.
   * @param {string} bibleId - Bible translation ID
   * @returns {Promise<void>}
   */
  async function deleteBible(bibleId) {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(bibleId);

      request.onsuccess = () => {
        memoryCache.delete(bibleId);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Gets all Bible IDs stored in IndexedDB.
   * @returns {Promise<string[]>} - Array of Bible IDs
   */
  async function getStoredBibles() {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Gets the estimated storage size in bytes.
   * @returns {Promise<number>} - Estimated size in bytes
   */
  async function getStorageSize() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }

  // Public API
  return {
    loadBible,
    getChapter,
    getBooks,
    hasBibleInDB,
    getStoredBibles,
    deleteBible,
    clearMemoryCache,
    getStorageSize,
    // Low-level methods for advanced use
    fetchBibleArchive,
    storeBible,
    getBibleFromDB
  };
})();

// Keeps the learner's project for each lesson in the browser, so a page reload does not lose it.
// Lesson progress is not stored separately: it follows from the blocks in the saved project.
import log from '../lib/log.js';

const DB_NAME = 'tutor';
const STORE = 'projects';

const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

// Runs one request on the store. Storage can be unavailable (private browsing), and the lesson
// must still work then, so failures are logged and answered with null.
const withStore = async (mode, makeRequest) => {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE, mode);
            const request = makeRequest(transaction.objectStore(STORE));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    } catch (error) {
        log.warn('saved-project: browser storage failed', error);
        return null;
    }
};

/**
 * @param {string} lessonId - the lesson the project belongs to
 * @returns {Promise<?ArrayBuffer>} the saved .sb3 data, or null when there is none
 */
const loadSavedProject = async lessonId => (await withStore('readonly', store => store.get(lessonId))) || null;

/**
 * @param {string} lessonId - the lesson the project belongs to
 * @param {ArrayBuffer} sb3 - the project as .sb3 data
 * @returns {Promise} settles when the project is stored
 */
const saveProject = (lessonId, sb3) => withStore('readwrite', store => store.put(sb3, lessonId));

/**
 * @param {string} lessonId - the lesson whose saved project is removed
 * @returns {Promise} settles when the project is removed
 */
const clearSavedProject = lessonId => withStore('readwrite', store => store.delete(lessonId));

export {clearSavedProject, loadSavedProject, saveProject};

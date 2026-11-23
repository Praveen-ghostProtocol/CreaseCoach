const storeName = 'clips';
let database;

function openDatabase() {
  database ||= new Promise((resolve,reject) => {
    const request = indexedDB.open('creasecoach-media',1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => {
      const connection = request.result;
      connection.onversionchange = () => { connection.close(); database = undefined; };
      resolve(connection);
    };
    request.onerror = () => reject(request.error);
  }).catch(error => { database = undefined; throw error; });
  return database;
}

async function access(mode,operation) {
  const connection = await openDatabase();
  return new Promise((resolve,reject) => {
    const transaction = connection.transaction(storeName,mode);
    const request = operation(transaction.objectStore(storeName));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error);
  });
}

export const storedClip = (workspace,id) => access('readonly',store => store.get(workspace + ':' + id));
export const keepClip = (workspace,id,file) => access('readwrite',store => store.put(file,workspace + ':' + id));
export const forgetClip = (workspace,id) => access('readwrite',store => store.delete(workspace + ':' + id));

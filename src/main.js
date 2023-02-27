const Apify = require('apify');
const { STORAGE_TYPES, DELETE_AFTER_DAYS } = require('./constants.js');
const { processKeyValueStores, stateKeyValueStores } = require('./process-key-value-stores.js');
const { processDatasets, stateDatasets } = require('./process-datasets');
const { processRequestQueue, stateRequestQueues } = require('./process-request-queues');

const logState = () => {
    console.log({
        [STORAGE_TYPES.DATASET]: stateDatasets.stats,
        [STORAGE_TYPES.KEY_VALUE]: stateKeyValueStores.stats,
        [STORAGE_TYPES.REQUEST_QUEUE]: stateRequestQueues.stats,
    });
};

const saveState = async () => {
    await Apify.setValue('STATE', {
        [STORAGE_TYPES.DATASET]: stateDatasets,
        [STORAGE_TYPES.KEY_VALUE]: stateKeyValueStores,
        [STORAGE_TYPES.REQUEST_QUEUE]: stateRequestQueues,
    });
    logState();
    console.log('State saved.');
};

Apify.main(async () => {
    const loadedState = await Apify.getValue('STATE');
    const input = await Apify.getValue('INPUT');
    const { forceDelete = false, storageType } = input || {};
    const deleteAfterDays = input.deleteAfterDays || DELETE_AFTER_DAYS;

    if (loadedState) {
        Object.assign(stateDatasets, loadedState[STORAGE_TYPES.DATASET]);
        Object.assign(stateKeyValueStores, loadedState[STORAGE_TYPES.KEY_VALUE]);
        Object.assign(stateRequestQueues, loadedState[STORAGE_TYPES.REQUEST_QUEUE]);
    }

    console.log(forceDelete ? 'Will delete items...' : 'Only dry run...');
    console.log(`Will process items older than ${deleteAfterDays} days`);

    setInterval(saveState, 30 * 1000);

    Apify.events.on('migrating', saveState);

    switch (storageType) {
        case STORAGE_TYPES.DATASET:
            await processDatasets(deleteAfterDays, forceDelete)
            break;
        case STORAGE_TYPES.KEY_VALUE:
            await processKeyValueStores(deleteAfterDays, forceDelete)
            break;
        case STORAGE_TYPES.REQUEST_QUEUE:
            await processRequestQueue(deleteAfterDays, forceDelete)
            break;
        case STORAGE_TYPES.ALL:
            await Promise.allSettled([
                processDatasets(deleteAfterDays, forceDelete).catch((e) => { console.error(e); }),
                processKeyValueStores(deleteAfterDays, forceDelete).catch((e) => { console.error(e); }),
                processRequestQueue(deleteAfterDays, forceDelete).catch((e) => { console.error(e); })
            ]);
            break;
        default:
            throw new Error(`Invalid storage type on input '${storageType}'.`);
    }

    logState();
    console.log('Done');
});

const Apify = require("apify");
const { createState } = require("./state");
const moment = require("moment");

const state = createState();

async function processKeyValueStores(deleteAfterDays, forceDelete, deleteUnnamedStorages) {
    const limit = 500;

    const dateLimit = moment().add(-deleteAfterDays, 'days');

    let totalItems = Number.MAX_SAFE_INTEGER;
    while (state.offset <= totalItems) {
        const pages = await Apify.client.keyValueStores.listStores({
            token: process.env.APIFY_TOKEN,
            limit,
            offset: state.offset,
            unnamed: deleteUnnamedStorages,
            desc: false,
        });

        if (pages.items.length === 0) {
            break;
        }

        totalItems = pages.total;

        let nothingYetDeletedForThisPage = true;

        const storesToBeDeleted = [];

        for (const storage of pages.items) {
            if (storage.name && storage.name.includes('daily-stats')) {
                continue;
            }

            if (moment(storage.accessedAt).isBefore(dateLimit)) {
                storesToBeDeleted.push(storage);
                if (forceDelete) {
                    nothingYetDeletedForThisPage = false;
                }
            }
            if (nothingYetDeletedForThisPage) {
                state.offset++;
            }
        }
        if (storesToBeDeleted.length > 0) {
            console.log(`${forceDelete ? 'Will' : 'Would'} delete ${storesToBeDeleted.length} kv-stores:\n` +
                `${storesToBeDeleted.map((store) => `${store.name || store.id}: accessed ${store.accessedAt}`).join(`\n`)}`);
        }

        if (forceDelete) {
            while (storesToBeDeleted.length > 0) {
                const deletedStores = [];
                await Promise.allSettled(
                    storesToBeDeleted.splice(0, 10).map((storeToBeDeleted) =>
                        Apify.client.keyValueStores.deleteStore({
                            storeId: storeToBeDeleted.id,
                            token: process.env.APIFY_TOKEN,
                        })
                            .catch((e) => { console.error(e); state.stats.issued++; })
                            .then(() => {
                                state.stats.deleted++;
                                deletedStores.push(storeToBeDeleted);
                            })
                    )
                )
                console.log(`Kv-stores with: ${deletedStores.map(store => store.name || store.id).join('. ')} were successfully Deleted!`)
            }
        }


        const daysAgoMoment = moment().subtract(deleteAfterDays, 'days');
        const shouldStop = pages.items.some((store) => {
            const createdAtMoment = moment(store.createdAt);
            return createdAtMoment.isAfter(daysAgoMoment);
        });

        if (shouldStop) break;
    }
}

module.exports = {
    processKeyValueStores,
    stateKeyValueStores: state
}

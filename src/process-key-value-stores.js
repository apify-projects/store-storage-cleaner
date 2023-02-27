const Apify = require("apify");
const { createState } = require("./state");
const { DAY_IN_MS } = require("./constants");
const moment = require("moment");

const state = createState();

async function processKeyValueStores(deleteAfterDays, forceDelete) {
    const limit = 500;
    let offset = 0;

    while (true) {
        const pages = await Apify.client.keyValueStores.listStores({
            token: process.env.APIFY_TOKEN,
            limit,
            offset,
            desc: false,
        });

        if (pages.items.length === 0) {
            break;
        }

        const now = Date.now();

        for (const storage of pages.items) {
            if (storage.name.includes('daily-stats')) {
                continue;
            }

            state.offset++;
            state.stats.processed++;

            const storeAccessedAt = new Date(storage.accessedAt);
            const diff = now - storeAccessedAt.getTime();
            if (diff > deleteAfterDays * DAY_IN_MS) {
                console.log(`${forceDelete ? 'Will' : 'Would'} delete dataset ${storage.name}, last accessed at ${storage.accessedAt}`);
                if (forceDelete) {
                    // Delete
                    await Apify.client.keyValueStores.deleteStore({
                        storeId: storage.id,
                        token: process.env.APIFY_TOKEN,
                    })
                        .catch((e) => { console.error(e); state.stats.issued++; })
                        .then(() => { state.stats.deleted++; });
                }
            }
        }

        offset += limit;

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

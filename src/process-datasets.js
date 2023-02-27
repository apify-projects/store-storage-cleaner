const Apify = require("apify");
const { createState } = require("./state");
const { DAY_IN_MS } = require("./constants");
const moment = require("moment");

const state = createState();

async function processDatasets(deleteAfterDays, forceDelete) {
    const limit = 500;
    let offset = 0;

    while (true) {
        const pages = await Apify.client.datasets.listDatasets({
            token: process.env.APIFY_TOKEN,
            limit,
            offset,
            desc: false,
        });

        if (pages.items.length === 0) {
            break;
        }

        const now = Date.now();

        for (const dataset of pages.items) {
            state.offset++;
            state.stats.processed++;

            const storeAccessedAt = new Date(dataset.accessedAt);
            const diff = now - storeAccessedAt.getTime();
            if (diff > deleteAfterDays * DAY_IN_MS) {
                console.log(`${forceDelete ? 'Will' : 'Would'} delete dataset ${dataset.name}, last accessed at ${dataset.accessedAt}`);
                if (forceDelete) {
                    // Delete
                    await Apify.client.datasets.deleteDataset({
                        datasetId: dataset.id,
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
    processDatasets,
    stateDatasets: state
}

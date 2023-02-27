const Apify = require("apify");
const { createState } = require("./state");
const { DAY_IN_MS } = require("./constants");
const moment = require("moment");

let state = createState();

async function processRequestQueue(deleteAfterDays, forceDelete) {
    const limit = 500;
    let offset = 0;

    while (true) {
        const pages = await Apify.client.requestQueues.listQueues({
            token: process.env.APIFY_TOKEN,
            limit,
            offset,
            desc: false,
        });

        if (pages.items.length === 0) {
            break;
        }

        const now = Date.now();

        for (const requestQueue of pages.items) {
            state.offset++;
            state.stats.processed++;

            const storeAccessedAt = new Date(requestQueue.accessedAt);
            const diff = now - storeAccessedAt.getTime();
            if (diff > deleteAfterDays * DAY_IN_MS) {
                console.log(`${forceDelete ? 'Will' : 'Would'} delete request queue ${requestQueue.name}, last accessed at ${requestQueue.accessedAt}`);
                if (forceDelete) {
                    // Delete
                    await Apify.client.requestQueues.deleteQueue({
                        token: process.env.APIFY_TOKEN,
                        queueId: requestQueue.id
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
    processRequestQueue,
    stateRequestQueues: state
}

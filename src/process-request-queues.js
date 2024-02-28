const Apify = require("apify");
const { createState } = require("./state");
const moment = require("moment");

const state = createState();

async function processRequestQueues(deleteAfterDays, forceDelete, deleteUnnamedStorages) {
    const limit = 500;

    const dateLimit = moment().add(-deleteAfterDays, 'days');

    let totalItems = Number.MAX_SAFE_INTEGER;
    while (state.offset <= totalItems) {
        const pages = await Apify.client.requestQueues.listQueues({
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

        const storagesToBeDeleted = [];

        for (const storage of pages.items) {
            if (moment(storage.accessedAt).isBefore(dateLimit)) {
                storagesToBeDeleted.push(storage);
                if (forceDelete) {
                    nothingYetDeletedForThisPage = false;
                }
            }
            if (nothingYetDeletedForThisPage) {
                state.offset++;
            }
        }

        if (storagesToBeDeleted.length > 0) {
            console.log(`${forceDelete ? 'Will' : 'Would'} delete ${storagesToBeDeleted.length} kv-stores:\n` +
                `${storagesToBeDeleted.map((store) => `${store.name || store.id}: accessed ${store.accessedAt}`).join(`\n`)}`);
        }

        if (forceDelete) {
            while (storagesToBeDeleted.length > 0) {
                const deletedStorages = [];
                await Promise.allSettled(
                    storagesToBeDeleted.splice(0, 10).map((requestQueue) =>
                        Apify.client.requestQueues.deleteQueue({
                            queueId: requestQueue.id,
                            token: process.env.APIFY_TOKEN,
                        })
                            .catch((e) => { console.error(e); state.stats.issued++; })
                            .then(() => {
                                state.stats.deleted++;
                                deletedStorages.push(requestQueue);
                            })
                    )
                )
                console.log(`Request Queues with: ${deletedStorages.map(store => store.name || store.id).join('. ')} were successfully Deleted!`)
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
    processRequestQueues,
    stateRequestQueues: state
}

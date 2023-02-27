module.exports = {
    createState: () => ({
        offset: 0,
        stats: {
            issued: 0,
            deleted: 0,
            processed: 0
        }
    })
}

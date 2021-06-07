const { ethers } = require('ethers');
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const CronJob = require('cron').CronJob;

const {
    getAdminLogsUsingCache,
    getRouterLogsUsingCache,
    getTokenLogsUsingCache,
    getFarmerLogsUsingCache,
} = require("../services/state-cache");

const getChunk = async () => {
    return {
        fromBlock: parseInt(process.env.FARM_GENESIS),
        toBlock: await provider.getBlockNumber(),
    }
}

new CronJob('0 0 */1 * * *', () => getChunk().then(getAdminLogsUsingCache), null, true).start();
new CronJob('0 15 */1 * * *', () => getChunk().then(getRouterLogsUsingCache), null, true).start();
new CronJob('0 30 */1 * * *', () => getChunk().then(getTokenLogsUsingCache), null, true).start();
new CronJob('0 45 */1 * * *', () => getChunk().then(getFarmerLogsUsingCache), null, true).start();

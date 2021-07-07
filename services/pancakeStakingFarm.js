const { ethers } = require('ethers');
const ConfigModel = require("../models/ConfigModel");
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const contractABI = require('../ABIs/PancakeStakingFarm.abi.json')

const pcFarm = new ethers.Contract('0x73feaa1eE314F8c655E354234017bE2193C9E24E', contractABI, provider)

async function loadPools() {
    // clear all state
    // await ConfigModel.deleteMany({ key: /^pc-farm-/ }).then(console.log).catch(console.error)

    const need = (await pcFarm.callStatic.poolLength()).toNumber()
    const have = await ConfigModel.countDocuments({ key: /^pc-farm-/ })
    console.log(`loading pool info: ${have}..${need}`)
    for (let id = have; id < need; ++id) {
        const info = await pcFarm.callStatic.poolInfo(id)
        console.log(`pool ${id}: ${info.lpToken}`)
        await ConfigModel.updateOne(
            { key: `pc-farm-${info.lpToken}` },
            { value: id },
            { upsert: true },
        );
    }
}
loadPools()

exports.getPoolId = async address => {
    return ConfigModel.findOne({ key: `pc-farm-${address}` }).lean().then(m => m && m.value);
}

exports.userInfo = async (poolId, address) => {
    return pcFarm.callStatic.userInfo(poolId, address)
}

exports.contract = pcFarm

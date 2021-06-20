
const createConfig = ({config, hardCap, target}) => {
    const getConcurrency = () => {
        return config.concurrency || 1
    }

    const getSize = () => {
        return config.size || 1
    }

    const _setSize = (newSize) => {
        const oldSize = config.size
        if (newSize > oldSize) {
            console.log(`CHUNK_SIZE (${type}) ++++ ${newSize}`)
        } else if (newSize < oldSize) {
            console.log(`CHUNK_SIZE (${type}) ---- ${newSize}`)
        } else {
            return  // no change
        }
        config.size = newSize
    }

    const getLogs = async ({ address, fromBlock, toBlock, topics }) => {
        // console.log(`getLogs:${type}`, {fromBlock, toBlock, address, topics})
        try {
            const logs = await config.provider.getLogs({
                address,
                topics,
                fromBlock,
                toBlock,
            });
            // console.log({logs})
            if (!Array.isArray(logs)) {
                throw new Error(JSON.stringify(logs));
            }
    
            // only adapt chunk size when the query is full chunk size
            if (toBlock - fromBlock + 1 >= getSize()) {
                _adapt(logs)
            }
            return logs;
        } catch(err) {
            _adapt(err)
            throw err
        }
    }

    /// should only be called when call is full chunk size
    /// result can be an Error object, or the logs.length
    const _adapt = (result) => {
        const concurrency = getConcurrency()
        const oldSize = getSize()

        const _chunkSizeUp = () => {
            let newSize = Math.floor(oldSize * Math.pow(5/3, 1/concurrency))
            if (newSize <= oldSize) {
                newSize = oldSize + 1
            }
            newSize = Math.min(hardCap, newSize)
            return _setSize(newSize)
        }
    
        const _chunkSizeDown = () => {
            let newSize = Math.floor(oldSize * Math.pow(1/2, 1/concurrency))
            newSize = Math.max(1, newSize)
            return _setSize(newSize)
        }

        if (result.code == 'TIMEOUT') {
            return _chunkSizeDown()
        }
        if (result.length < target) {
            return _chunkSizeUp()
        }
    }

    return {
        getLogs,
        getConcurrency,
        getSize,
    }
}

exports.createConfig = createConfig;
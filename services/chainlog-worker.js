'use strict'

class ChainlogWorker {
    constructor(get) {
        this._consumerLoader = get('consumerLoader')
        this._ethersProvider = get('ethersProvider').native
        this._headProcessor = get('headProcessor')
        this._pastProcessor = get('pastProcessor')
        this._isCatchingUp = false
    }

    async open() {}

    async close() {}

    // Descriptions
    //  * Start to process ETH logs, forever.
    async start() {
        console.log('State consumers', this._consumerLoader.list)

        await this._processLatestBlock()
        this._startHeadProcessing()
        this._startPastProcessing()
    }

    async _processLatestBlock() {
        let latestBlockNumber = await this._ethersProvider.getBlockNumber()

        await this._processHeadBlock(latestBlockNumber)
    }

    async _processHeadBlock(head) {
        console.log('New block', head)

        if (this._isCatchingUp) {
            return
        }

        try {
            this._isCatchingUp = true;
            await this._headProcessor.process(head)
        } catch (err) {
            console.error(err)
        } finally {
            this._isCatchingUp = false;
        }
    }

    _startHeadProcessing() {
        this._ethersProvider.on('block', this._processHeadBlock.bind(this))
    }

    _startPastProcessing() {
        this._pastProcessor.process()
            .then(nextDelay => {
                setTimeout(this._startPastProcessing.bind(this), nextDelay || 1000)
            })
            .catch(err => {
                console.log(err)
                setTimeout(this._startPastProcessing.bind(this), 1000)
            })
    }
}

module.exports = ChainlogWorker

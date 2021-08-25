# Quick Start

```bash
# STEP 1.
#
# Make sure following package is installed: 
#   * node v10
#   * npm v6
#   * mongo-server v4
#
# Make sure it is able to:
#   * Connect to mongo server with URL: "mongodb://localhost/sfarm".

# STEP 2.
# 
# Create a directory to work in.
mkdir quick-start
cd quick-start

# STEP 3.
#
# Create a file which is store a contract ABI.
# Get content of this file below.
touch sfarm-abi.json

# STEP 4.
#
# Create a worker to retrieve and store data from BSC network.
# Get content of this file below.
touch worker.js

# Step 5.
#
# Test it by run for a while.
timeout 15 node worker.js
```

* File [sfarm-abi.json](../test/quick-start/sfarm-abi.json)
* File [worker.js](../test/quick-start/worker.js)

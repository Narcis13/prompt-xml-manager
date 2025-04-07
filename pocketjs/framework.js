// framework.js
const util = require('util');

// Helper for async sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class BaseNode {
    constructor() {
        this.params = {};
        this.successors = {}; // { action: nextNode }
    }

    setParams(params) {
        // Store a copy to avoid modifying the object passed in,
        // crucial for flows running multiple times or in parallel.
        this.params = { ...params };
        return this; // Allow chaining
    }

    addSuccessor(node, action = "default") {
        if (this.successors[action]) {
            console.warn(`Overwriting successor for action '${action}' on node ${this.constructor.name}`);
        }
        this.successors[action] = node;
        return node; // Allow chaining like python version
    }

    // --- Methods for defining transitions ---

    /** Sets the default next node (equivalent to >> in Python) */
    next(node) {
        return this.addSuccessor(node, "default");
    }

    /** Starts defining a conditional transition (equivalent to - "action" in Python) */
    on(action) {
        if (typeof action !== 'string') {
            throw new TypeError("Action must be a string");
        }
        // Return an object with a goTo method to complete the transition definition
        return {
            goTo: (targetNode) => this.addSuccessor(targetNode, action)
        };
    }

    // --- Lifecycle Methods (to be overridden by subclasses) ---

    /** Prepare input data or context. Can be async. */
    async prep(shared) {
        // Default implementation does nothing
        return undefined;
    }

    /** Execute the main logic. Can be async. */
    async exec(prepRes) {
        // Default implementation does nothing
        return undefined;
    }

    /** Process results, update shared context. Can be async.
     * The return value is often used by Flows to determine the next action. */
    async post(shared, prepRes, execRes) {
        // Default implementation returns nothing (-> "default" action in flows)
        return undefined;
    }

    /** Fallback logic if exec fails after all retries. Can be async. */
    async execFallback(prepRes, exc) {
        // Default implementation re-throws the error
        throw exc;
    }

    // --- Internal Execution Logic ---

    /** Internal execution wrapper (handles retries in subclasses). Always async. */
    async _exec(prepRes) {
        // Base implementation just calls exec directly
        try {
            return await this.exec(prepRes);
        } catch (e) {
            // If exec fails here, call fallback immediately (no retries in BaseNode)
            return await this.execFallback(prepRes, e);
        }
    }

    /** Internal run sequence for a single node. Always async. */
    async _run(shared) {
        let prepRes = undefined;
        let execRes = undefined;
        try {
            prepRes = await this.prep(shared);
            execRes = await this._exec(prepRes); // _exec handles retries/fallback
            return await this.post(shared, prepRes, execRes);
        } catch (error) {
            console.error(`Error during _run of ${this.constructor.name}:`, error);
            // Decide how to handle errors bubbling up from prep/post/fallback
            // Option 1: Re-throw - stops the flow
             throw error;
            // Option 2: Return an error indicator action (if flows are designed for it)
            // return "error";
            // Option 3: Return undefined / null
            // return undefined;
        }
    }

    /** Public method to run a single node in isolation. Always async. */
    async run(shared) {
        if (Object.keys(this.successors).length > 0) {
            console.warn(`Node ${this.constructor.name} won't run successors when called with run(). Use a Flow.`);
        }
        return this._run(shared);
    }
}

class Node extends BaseNode {
    constructor(maxRetries = 1, wait = 0) {
        super();
        this.maxRetries = Math.max(1, maxRetries); // Ensure at least 1 attempt
        this.wait = wait > 0 ? wait * 1000 : 0; // Convert seconds to ms
        this.currentRetry = 0;
    }

    /** Overrides BaseNode._exec to add retry logic. */
    async _exec(prepRes) {
        for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
            try {
                return await this.exec(prepRes); // Attempt execution
            } catch (e) {
                console.warn(`Node ${this.constructor.name} failed on attempt ${this.currentRetry + 1}/${this.maxRetries}. Error: ${e.message}`);
                if (this.currentRetry === this.maxRetries - 1) {
                    // Last retry failed, execute fallback
                    console.warn(`Node ${this.constructor.name} executing fallback after ${this.maxRetries} failed attempts.`);
                    return await this.execFallback(prepRes, e);
                }
                if (this.wait > 0) {
                    await sleep(this.wait);
                }
            }
        }
        // This part should theoretically not be reached due to fallback, but included for safety
        throw new Error(`Node ${this.constructor.name} failed after ${this.maxRetries} retries and fallback did not return/throw.`);
    }
}

class BatchNode extends Node {
    /** Overrides Node._exec to process items sequentially. */
    async _exec(items) {
        const results = [];
        // Ensure items is iterable, default to empty array if null/undefined
        for (const item of items || []) {
            // Each item goes through the parent's _exec (including retries)
            results.push(await super._exec(item));
        }
        return results;
    }
}


class Flow extends BaseNode {
    constructor(startNode) {
        if (!startNode) throw new Error("Flow must be initialized with a start node.");
        super();
        this.start = startNode;
    }

    getNextNode(currentNode, action) {
        const nextNode = currentNode.successors[action || "default"];
        if (!nextNode && Object.keys(currentNode.successors).length > 0 && action !== undefined) {
            // Only warn if there were successors defined but the action didn't match
             console.warn(`Flow ends: Action '${action || 'default'}' not found in successors ${util.inspect(Object.keys(currentNode.successors))} of node ${currentNode.constructor.name}`);
        } else if (!nextNode && Object.keys(currentNode.successors).length === 0) {
             // Normal end of flow path
             // console.log(`Flow path ended at node ${currentNode.constructor.name}`);
        }
        return nextNode; // Returns the next node or undefined
    }

    /** Orchestrates the flow execution. Always async. */
    async _orch(shared, flowParams = null) {
        let currentNode = this.start;
        // Combine flow-level params with run-specific params
        const currentRunParams = { ...this.params, ...(flowParams || {}) };

        while (currentNode) {
            // Create a fresh instance of the node for this specific execution path?
            // Or rely on setParams creating a copy? Let's rely on setParams for now.
            // If nodes modify their internal state beyond params, copying might be needed.
            // const nodeInstance = new currentNode.constructor(); // Needs args? Complicated.
            // Object.assign(nodeInstance, currentNode); // Shallow copy - might share successors dict?
            const nodeToRun = currentNode; // Use the reference for now

            nodeToRun.setParams(currentRunParams); // Set params for this run

            // Run the node (Node._run is async)
            const actionResult = await nodeToRun._run(shared);

            // Get the next node based on the action result
            currentNode = this.getNextNode(nodeToRun, actionResult);
        }
         // console.log("Flow orchestration complete.");
    }

    /** Overrides BaseNode._run for Flow orchestration. Always async. */
    async _run(shared) {
        // 1. Run the Flow's own prep step (can prepare shared state or flow params)
        const prepRes = await this.prep(shared); // Can modify shared or return flow-specific info

        // 2. Run the orchestration of the nodes
        await this._orch(shared); // Pass base flow params + prep results? Needs design decision.

        // 3. Run the Flow's own post step (can process final shared state)
        // Note: execRes for the flow itself is null/undefined
        return await this.post(shared, prepRes, null);
    }

    /** Flows orchestrate; they don't have a primary 'exec'. */
    async exec(prepRes) {
        throw new Error("Flow instances cannot be executed directly via 'exec'. They orchestrate other nodes.");
    }
}


class BatchFlow extends Flow {
    /** Overrides Flow._run for batch orchestration. Always async. */
    async _run(shared) {
        // 1. Flow's prep expected to return an array of items/params for batching
        const batchParamList = await this.prep(shared) || [];
        if (!Array.isArray(batchParamList)) {
            console.warn(`BatchFlow ${this.constructor.name} prep() did not return an array. Proceeding with empty batch.`);
            batchParamList = [];
        }

        // 2. Orchestrate the flow sequentially for each item/param set
        for (const batchParams of batchParamList) {
             // Pass combined flow params and batch-specific params to _orch
            await this._orch(shared, { ...this.params, ...batchParams });
        }

        // 3. Flow's post receives the original list prepared in step 1
        return await this.post(shared, batchParamList, null);
    }
}

// --- ASYNCHRONOUS-SPECIFIC CLASSES ---
// Note: Since BaseNode/Node already use async internally for waits/retries,
// these Async classes primarily enforce overriding async methods and provide
// parallel execution capabilities.

class AsyncNode extends Node {
    // Enforce usage of async methods by overriding sync ones to throw
    prep(shared) { throw new Error("Use prepAsync for AsyncNode"); }
    exec(prepRes) { throw new Error("Use execAsync for AsyncNode"); }
    post(shared, prepRes, execRes) { throw new Error("Use postAsync for AsyncNode"); }
    execFallback(prepRes, exc) { throw new Error("Use execFallbackAsync for AsyncNode"); }

    // --- Async Lifecycle Methods (to be overridden) ---
    async prepAsync(shared) { return undefined; }
    async execAsync(prepRes) { return undefined; }
    async postAsync(shared, prepRes, execRes) { return undefined; }
    async execFallbackAsync(prepRes, exc) { throw exc; }

    /** Override Node._exec to call execAsync and execFallbackAsync */
    async _exec(prepRes) {
         for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
            try {
                return await this.execAsync(prepRes); // Call async version
            } catch (e) {
                console.warn(`AsyncNode ${this.constructor.name} failed on attempt ${this.currentRetry + 1}/${this.maxRetries}. Error: ${e.message}`);
                if (this.currentRetry === this.maxRetries - 1) {
                    console.warn(`AsyncNode ${this.constructor.name} executing async fallback after ${this.maxRetries} failed attempts.`);
                    return await this.execFallbackAsync(prepRes, e); // Call async version
                }
                if (this.wait > 0) {
                    await sleep(this.wait);
                }
            }
        }
         throw new Error(`AsyncNode ${this.constructor.name} failed after ${this.maxRetries} retries and async fallback did not return/throw.`);
    }

     /** Internal run sequence using async methods. */
    async _runAsync(shared) {
         let prepRes = undefined;
        let execRes = undefined;
        try {
            prepRes = await this.prepAsync(shared);
            execRes = await this._exec(prepRes); // Uses the overridden _exec calling execAsync
            return await this.postAsync(shared, prepRes, execRes);
        } catch (error) {
            console.error(`Error during _runAsync of ${this.constructor.name}:`, error);
            throw error; // Re-throw by default
        }
    }

    /** Public async run method */
    async runAsync(shared) {
         if (Object.keys(this.successors).length > 0) {
            console.warn(`AsyncNode ${this.constructor.name} won't run successors when called with runAsync(). Use an AsyncFlow.`);
        }
        return this._runAsync(shared);
    }

    // Override _run to call _runAsync for consistency if someone calls run() on an AsyncNode
    async _run(shared) {
        // console.warn(`Called _run() on AsyncNode ${this.constructor.name}, redirecting to _runAsync()`);
        return this._runAsync(shared);
    }
}


class AsyncBatchNode extends AsyncNode {
     /** Overrides AsyncNode._exec for sequential async batch processing. */
     async _exec(items) {
        const results = [];
        for (const item of items || []) {
            // Uses AsyncNode's _exec (which calls execAsync + handles retries/fallback)
             results.push(await super._exec(item));
        }
        return results;
    }
}


class AsyncParallelBatchNode extends AsyncNode {
    /** Overrides AsyncNode._exec for parallel async batch processing. */
     async _exec(items) {
        // Start all exec tasks concurrently and wait for all to complete
        const promises = (items || []).map(item => super._exec(item));
        return Promise.all(promises);
    }
}


class AsyncFlow extends Flow {
     // Enforce usage of async methods for the flow itself
    prep(shared) { throw new Error("Use prepAsync for AsyncFlow"); }
    post(shared, prepRes, execRes) { throw new Error("Use postAsync for AsyncFlow"); }

    // --- Async Lifecycle Methods for the Flow ---
    async prepAsync(shared) { return undefined; }
    async postAsync(shared, prepRes, execRes) { return undefined; }


    /** Orchestration that handles both AsyncNode and regular Node instances. */
    async _orchAsync(shared, flowParams = null) {
        let currentNode = this.start;
        const currentRunParams = { ...this.params, ...(flowParams || {}) };

        while (currentNode) {
            const nodeToRun = currentNode;
            nodeToRun.setParams(currentRunParams);

            let actionResult;
            // Check if the node has an async-specific run method
            if (nodeToRun instanceof AsyncNode && typeof nodeToRun._runAsync === 'function') {
                actionResult = await nodeToRun._runAsync(shared);
            } else {
                // Otherwise, use the standard _run (which is already async)
                actionResult = await nodeToRun._run(shared);
            }

            currentNode = this.getNextNode(nodeToRun, actionResult);
        }
        // console.log("AsyncFlow orchestration complete.");
    }

    /** Flow execution using async lifecycle and orchestration. */
    async _runAsync(shared) {
        const prepRes = await this.prepAsync(shared);
        await this._orchAsync(shared); // Use the async-aware orchestrator
        return await this.postAsync(shared, prepRes, null);
    }

    // Override _run to call _runAsync
     async _run(shared) {
        // console.warn(`Called _run() on AsyncFlow ${this.constructor.name}, redirecting to _runAsync()`);
        return this._runAsync(shared);
    }
}

class AsyncBatchFlow extends AsyncFlow {
     /** Runs the async flow sequentially for each batch item from prepAsync. */
     async _runAsync(shared) {
        const batchParamList = await this.prepAsync(shared) || [];
         if (!Array.isArray(batchParamList)) {
            console.warn(`AsyncBatchFlow ${this.constructor.name} prepAsync() did not return an array. Proceeding with empty batch.`);
            batchParamList = [];
        }

        for (const batchParams of batchParamList) {
            await this._orchAsync(shared, { ...this.params, ...batchParams });
        }

        return await this.postAsync(shared, batchParamList, null);
    }
}

class AsyncParallelBatchFlow extends AsyncFlow {
    /** Runs the async flow concurrently for each batch item from prepAsync. */
     async _runAsync(shared) {
        const batchParamList = await this.prepAsync(shared) || [];
         if (!Array.isArray(batchParamList)) {
            console.warn(`AsyncParallelBatchFlow ${this.constructor.name} prepAsync() did not return an array. Proceeding with empty batch.`);
            batchParamList = [];
        }

        // Create all orchestration promises
        const orchPromises = batchParamList.map(batchParams =>
            this._orchAsync(shared, { ...this.params, ...batchParams })
        );

        // Wait for all concurrent flows to complete
        await Promise.all(orchPromises);

        return await this.postAsync(shared, batchParamList, null);
    }
}


// Export all classes
module.exports = {
    sleep,
    BaseNode,
    Node,
    BatchNode,
    Flow,
    BatchFlow,
    AsyncNode,
    AsyncBatchNode,
    AsyncParallelBatchNode,
    AsyncFlow,
    AsyncBatchFlow,
    AsyncParallelBatchFlow,
};
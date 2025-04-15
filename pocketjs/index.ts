// Define a type for objects that aren't iterable - used for parameters
type NonIterableObject = Partial<Record<string, unknown>> & { [Symbol.iterator]?: never };
// Define a simple type for actions - just strings
type Action = string;

/**
 * BaseNode is the fundamental building block for all nodes in the system
 * S = shared state type that gets passed between nodes
 * P = parameters specific to this node
 */
class BaseNode<S = unknown, P extends NonIterableObject = NonIterableObject> {
  // Store the node's parameters
  protected _params: P = {} as P;
  // Map to store connections to other nodes via different "actions"
  protected _successors: Map<Action, BaseNode> = new Map();
  
  // Internal execution method that wraps the public exec method
  protected async _exec(prepRes: unknown): Promise<unknown> { 
    return await this.exec(prepRes); 
  }
  
  // Preparation phase - runs before execution
  // Can be overridden by child classes to do setup work
  async prep(shared: S): Promise<unknown> { 
    return undefined; 
  }
  
  // Main execution phase - implement this in child classes
  // This is where the main work of the node happens
  async exec(prepRes: unknown): Promise<unknown> { 
    return undefined; 
  }
  
  // Post-execution phase - runs after execution
  // Returns the next action to take (which determines the next node)
  async post(shared: S, prepRes: unknown, execRes: unknown): Promise<Action | undefined> { 
    return undefined; 
  }
  
  // Internal run method that coordinates prep -> exec -> post
  async _run(shared: S): Promise<Action | undefined> {
    // First run prep phase and get its result
    const p = await this.prep(shared);
    // Then run exec phase with prep results
    const e = await this._exec(p); 
    // Finally run post phase with both prep and exec results
    return await this.post(shared, p, e);
  }
  
  // Public run method - warns if successors exist (should use Flow instead)
  async run(shared: S): Promise<Action | undefined> {
    if (this._successors.size > 0) console.warn("Node won't run successors. Use Flow.");
    return await this._run(shared);
  }
  
  // Set parameters for this node (builder pattern - returns this for chaining)
  setParams(params: P): this { 
    this._params = params; 
    return this; 
  }
  
  // Add a successor node with the default action
  next<T extends BaseNode>(node: T): T { 
    this.on("default", node); 
    return node; 
  }
  
  // Connect this node to another node via a specific action
  on(action: Action, node: BaseNode): this {
    if (this._successors.has(action)) console.warn(`Overwriting successor for action '${action}'`);
    this._successors.set(action, node); 
    return this; 
  }
  
  // Get the next node to run based on the action returned from post
  getNextNode(action: Action = "default"): BaseNode | undefined {
    const nextAction = action || 'default';
    const next = this._successors.get(nextAction)
    
    // Warn if we can't find the next node but have other options
    if (!next && this._successors.size > 0)
      console.warn(`Flow ends: '${nextAction}' not found in [${Array.from(this._successors.keys())}]`)
    
    return next
  }
  
  // Create a copy of this node (useful for reusing node templates)
  clone(): this {
    const clonedNode = Object.create(Object.getPrototypeOf(this)); 
    Object.assign(clonedNode, this);
    // Make copies of internal state to avoid shared references
    clonedNode._params = { ...this._params }; 
    clonedNode._successors = new Map(this._successors);
    return clonedNode;
  }
}

/**
 * Node extends BaseNode and adds retry capability
 * Useful for operations that might fail temporarily
 */
class Node<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
  maxRetries: number;    // Maximum number of retry attempts
  wait: number;          // Time to wait between retries (in seconds)
  currentRetry: number = 0;  // Tracks current retry count
  
  constructor(maxRetries: number = 1, wait: number = 0) {
    super(); 
    this.maxRetries = maxRetries; 
    this.wait = wait;
  }
  
  // Called when all retries fail - can handle errors or throw
  async execFallback(prepRes: unknown, error: Error): Promise<unknown> { 
    throw error; // Default is to re-throw the error
  }
  
  // Overrides _exec to add retry logic
  async _exec(prepRes: unknown): Promise<unknown> {
    for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
      try { 
        // Try to execute and return result if successful
        return await this.exec(prepRes); 
      } 
      catch (e) {
        // If this was the last retry, call fallback
        if (this.currentRetry === this.maxRetries - 1) 
          return await this.execFallback(prepRes, e as Error);
        
        // Otherwise wait and try again
        if (this.wait > 0) 
          await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
      }
    }
    return undefined;
  }
}

/**
 * BatchNode processes an array of items one at a time
 * Each item is processed sequentially through the exec method
 */
class BatchNode<S = unknown, P extends NonIterableObject = NonIterableObject> extends Node<S, P> {
  async _exec(items: unknown[]): Promise<unknown[]> {
    // Check if input is valid
    if (!items || !Array.isArray(items)) return [];
    
    // Process each item one by one and collect results
    const results = []; 
    for (const item of items) 
      results.push(await super._exec(item)); 
    
    return results;
  }
}

/**
 * ParallelBatchNode processes an array of items all at once
 * All items are processed in parallel for better performance
 */
class ParallelBatchNode<S = unknown, P extends NonIterableObject = NonIterableObject> extends Node<S, P> {
  async _exec(items: unknown[]): Promise<unknown[]> {
    // Check if input is valid
    if (!items || !Array.isArray(items)) return []
    
    // Process all items in parallel with Promise.all
    return Promise.all(items.map((item) => super._exec(item)))
  }
}

/**
 * Flow connects multiple nodes together and runs them in sequence
 * Each node's output action determines which node runs next
 */
class Flow<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
  start: BaseNode;  // The first node to run in the flow
  
  constructor(start: BaseNode) { 
    super(); 
    this.start = start; 
  }
  
  // Core orchestration logic - runs nodes in sequence
  protected async _orchestrate(shared: S, params?: P): Promise<void> {
    // Start with a clone of the first node
    let current: BaseNode | undefined = this.start.clone();
    // Use provided params or the flow's params
    const p = params || this._params;
    
    // Keep running nodes until we hit undefined (end of flow)
    while (current) {
      // Set params and run the current node
      current.setParams(p); 
      const action = await current._run(shared);
      
      // Get the next node based on the returned action
      current = current.getNextNode(action); 
      // Clone it if it exists
      current = current?.clone();
    }
  }
  
  // Run the flow from start to finish
  async _run(shared: S): Promise<Action | undefined> {
    const pr = await this.prep(shared); 
    await this._orchestrate(shared);
    return await this.post(shared, pr, undefined);
  }
  
  // Flows can't directly exec - they orchestrate other nodes
  async exec(prepRes: unknown): Promise<unknown> { 
    throw new Error("Flow can't exec."); 
  }
}

/**
 * BatchFlow runs the same flow multiple times with different parameters
 * Parameters are generated by the prep method
 */
class BatchFlow<S = unknown, P extends NonIterableObject = NonIterableObject, NP extends NonIterableObject[] = NonIterableObject[]> extends Flow<S, P> {
  async _run(shared: S): Promise<Action | undefined> {
    // Get batch parameters from prep
    const batchParams = await this.prep(shared);
    
    // Run the flow once for each set of parameters
    for (const bp of batchParams) {
      // Merge flow params with batch params
      const mergedParams = { ...this._params, ...bp };
      await this._orchestrate(shared, mergedParams);
    }
    
    return await this.post(shared, batchParams, undefined);
  }
  
  // Override to return an array of parameter objects
  async prep(shared: S): Promise<NP> { 
    const empty: readonly NonIterableObject[] = []; 
    return empty as NP; 
  }
}

/**
 * ParallelBatchFlow runs multiple flows in parallel with different parameters
 * Similar to BatchFlow but all flows run at the same time
 */
class ParallelBatchFlow<S = unknown, P extends NonIterableObject = NonIterableObject, NP extends NonIterableObject[] = NonIterableObject[]> extends BatchFlow<S, P, NP> {
  async _run(shared: S): Promise<Action | undefined> {
    // Get batch parameters from prep
    const batchParams = await this.prep(shared);
    
    // Run all flows in parallel using Promise.all
    await Promise.all(batchParams.map(bp => {
      const mergedParams = { ...this._params, ...bp };
      return this._orchestrate(shared, mergedParams);
    }));
    
    return await this.post(shared, batchParams, undefined);
  }
}

export { BaseNode, Node, BatchNode, ParallelBatchNode, Flow, BatchFlow, ParallelBatchFlow };
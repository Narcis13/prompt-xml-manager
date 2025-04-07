// example.js
const {
    Node, Flow, AsyncNode, AsyncFlow, sleep
} = require('./framework'); // Assuming framework.js is in the same directory

// --- Define Nodes ---

// Simple synchronous node
class FormatPrompt extends Node {
    async exec(prepRes) {
        console.log("Formatting Prompt...");
        const topic = this.params.topic || 'default topic';
        return `Generate a short story about: ${topic}`;
    }
}

// Async node simulating an LLM call
class CallLLM extends AsyncNode {
    constructor() {
        // Retry 3 times, wait 1 second between retries
        super(3, 1);
    }

    async execAsync(prompt) {
        console.log(`Calling LLM with prompt: "${prompt}" (Attempt ${this.currentRetry + 1})`);
        // Simulate API call
        await sleep(500); // Simulate network latency

        // Simulate potential transient failure
        if (Math.random() < 0.4 && this.currentRetry < 2) { // Fail sometimes on first 2 tries
             console.log("LLM Call failed, will retry...");
             throw new Error("Simulated API Error");
        }

        console.log("LLM Call successful.");
        // Return different results based on prompt for branching example
        if (prompt.includes("sad topic")) {
            return { text: "A gloomy tale unfolded...", quality: "low" };
        }
        return { text: "Once upon a time...", quality: "high" };
    }

    // Custom fallback if all retries fail
    async execFallbackAsync(prepRes, error) {
        console.error("LLM call failed permanently after retries.", error.message);
        return { text: "Placeholder story due to error.", quality: "error" };
    }

    // Post-processing to extract text and determine action
    async postAsync(shared, prepRes, execRes) {
        console.log("Processing LLM Response...");
        shared.llmResultText = execRes.text; // Store result in shared state
        // Return an action string based on quality for the flow
        return execRes.quality; // e.g., "high", "low", "error"
    }
}

// Another simple node
class SaveResult extends Node {
    async exec(prepRes) { // prepRes is undefined in this flow path
        console.log(`Saving Result: "${this.shared.llmResultText}"`);
        // Simulate saving to DB or file
        await sleep(100);
        console.log("Result Saved.");
        return "saved"; // Action for the flow (though it's the end here)
    }

    // Need access to shared state, get it in prep
    async prep(shared) {
        this.shared = shared; // Make shared available in exec
    }
}

class LogErrorNode extends Node {
     async exec(prepRes) {
        console.error(`Logging Error State: Final LLM result was "${this.shared.llmResultText}"`);
        return "error_logged";
     }
     async prep(shared) {
        this.shared = shared;
    }
}


// --- Define and Run Flow ---

async function main() {
    // Create node instances
    const format = new FormatPrompt();
    const call = new CallLLM();
    const save = new SaveResult();
    const logError = new LogErrorNode();
    const saveLowQuality = new SaveResult(); // Can reuse class

    // Define the flow structure using method chaining
    format
        .next(call) // Default transition from format -> call

    call
        .on("high").goTo(save)        // If call returns "high", go to save
        .on("low").goTo(saveLowQuality) // If call returns "low", go elsewhere (here, also save)
        .on("error").goTo(logError);    // If call returns "error", go to logError

    // Create the flow, starting at the 'format' node
    const storyFlow = new AsyncFlow(format); // Use AsyncFlow as it contains an AsyncNode

    // Shared state object
    const sharedData = {
        runId: `run_${Date.now()}`
    };

    console.log("--- Starting Flow Run 1 (Default Topic) ---");
    // Set parameters for the flow run (can also be set on individual nodes beforehand)
    storyFlow.setParams({ topic: "a brave knight" });
    await storyFlow.run(sharedData); // Use run() for flows
    console.log("Flow Run 1 Complete. Shared Data:", sharedData);

    console.log("\n--- Starting Flow Run 2 (Sad Topic - expecting 'low' quality path) ---");
    const sharedData2 = { runId: `run_${Date.now()}` };
    storyFlow.setParams({ topic: "a sad topic" }); // Override topic for this run
    await storyFlow.run(sharedData2);
    console.log("Flow Run 2 Complete. Shared Data:", sharedData2);

     console.log("\n--- Starting Flow Run 3 (Force Error Fallback) ---");
     // Temporarily make the LLM always fail to test fallback/error path
     const originalExecAsync = call.execAsync;
     call.execAsync = async function() { // Override directly for test
         console.log(`Forcing failure in CallLLM (Attempt ${this.currentRetry + 1})`);
         throw new Error("Forced failure for testing error path");
     }
     const sharedData3 = { runId: `run_${Date.now()}` };
     storyFlow.setParams({ topic: "an error topic" });
     await storyFlow.run(sharedData3);
     console.log("Flow Run 3 Complete. Shared Data:", sharedData3);
     call.execAsync = originalExecAsync; // Restore original method
}

main().catch(err => console.error("Main execution error:", err));
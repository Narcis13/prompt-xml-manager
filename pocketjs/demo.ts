import { Node, Flow, BatchNode } from './framework';
import axios from 'axios';

// Define our shared state interface for type safety
interface DocumentState {
  originalText: string;
  chunks: string[];
  chunkSummaries: string[];
  finalSummary: string;
  documentTitle: string;
  keywords: string[];
}

// First node: Split document into manageable chunks
class DocumentSplitterNode extends Node<DocumentState> {
  async exec(prepRes: unknown): Promise<string[]> {
    const state = this._params as DocumentState;
    console.log("Splitting document into chunks...");
    
    // Simple splitter that divides the text into chunks of roughly 1000 characters
    // In a real implementation, you'd use a smarter splitter that doesn't break sentences
    const text = state.originalText;
    const chunkSize = 1000;
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    
    console.log(`Created ${chunks.length} chunks`);
    return chunks;
  }
  
  async post(shared: DocumentState, prepRes: unknown, chunks: string[]): Promise<string> {
    // Store chunks in shared state
    shared.chunks = chunks;
    return "default"; // Proceed to next node
  }
}

// Second node: Summarize each chunk using LLM
class ChunkSummarizerNode extends BatchNode<DocumentState> {
  // This will be called for each chunk in the batch
  async exec(chunk: string): Promise<string> {
    console.log(`Summarizing chunk: ${chunk.substring(0, 30)}...`);
    
    try {
      // Call to an LLM API (simplified)
      const response = await axios.post('https://api.llm-provider.com/v1/completions', {
        model: 'text-summarizer-model',
        prompt: `Summarize the following text concisely:\n\n${chunk}`,
        max_tokens: 150,
        temperature: 0.3,
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Extract summary from response
      const summary = response.data.choices[0].text.trim();
      console.log(`Generated summary: ${summary.substring(0, 30)}...`);
      return summary;
    } catch (error) {
      console.error("Error calling LLM API:", error);
      return `Failed to summarize: ${chunk.substring(0, 30)}...`;
    }
  }
  
  async prep(shared: DocumentState): Promise<string[]> {
    // Return the chunks to be processed
    return shared.chunks;
  }
  
  async post(shared: DocumentState, chunks: string[], summaries: string[]): Promise<string> {
    // Store individual summaries
    shared.chunkSummaries = summaries;
    return "default";
  }
}

// Third node: Create title for the document
class TitleGeneratorNode extends Node<DocumentState> {
  async exec(prepRes: unknown): Promise<string> {
    const state = this._params as DocumentState;
    const allSummaries = state.chunkSummaries.join("\n");
    
    console.log("Generating document title...");
    
    try {
      // Call to LLM API to generate a title
      const response = await axios.post('https://api.llm-provider.com/v1/completions', {
        model: 'text-summarizer-model',
        prompt: `Based on these summaries, generate a concise and descriptive title for the document:\n\n${allSummaries}`,
        max_tokens: 20,
        temperature: 0.7,
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const title = response.data.choices[0].text.trim();
      console.log(`Generated title: ${title}`);
      return title;
    } catch (error) {
      console.error("Error calling LLM API for title:", error);
      return "Untitled Document";
    }
  }
  
  async post(shared: DocumentState, prepRes: unknown, title: string): Promise<string> {
    // Store title in shared state
    shared.documentTitle = title;
    return "default";
  }
}

// Fourth node: Generate final comprehensive summary
class FinalSummarizerNode extends Node<DocumentState> {
  async exec(prepRes: unknown): Promise<string> {
    const state = this._params as DocumentState;
    const allSummaries = state.chunkSummaries.join("\n");
    
    console.log("Creating final document summary...");
    
    try {
      // Call to LLM API to create the final summary
      const response = await axios.post('https://api.llm-provider.com/v1/completions', {
        model: 'text-summarizer-model',
        prompt: `Create a comprehensive but concise summary of this document based on these section summaries:\n\n${allSummaries}\n\nDocument Title: ${state.documentTitle}\n\nFinal Summary:`,
        max_tokens: 300,
        temperature: 0.4,
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const finalSummary = response.data.choices[0].text.trim();
      console.log(`Generated final summary: ${finalSummary.substring(0, 50)}...`);
      return finalSummary;
    } catch (error) {
      console.error("Error calling LLM API for final summary:", error);
      return "Failed to generate final summary.";
    }
  }
  
  async post(shared: DocumentState, prepRes: unknown, finalSummary: string): Promise<string> {
    // Store final summary in shared state
    shared.finalSummary = finalSummary;
    return "default";
  }
}

// Fifth node: Extract keywords from the summary
class KeywordExtractorNode extends Node<DocumentState> {
  async exec(prepRes: unknown): Promise<string[]> {
    const state = this._params as DocumentState;
    
    console.log("Extracting keywords...");
    
    try {
      // Call to LLM API to extract keywords
      const response = await axios.post('https://api.llm-provider.com/v1/completions', {
        model: 'text-summarizer-model',
        prompt: `Extract 5-7 important keywords or phrases from this text:\n\n${state.finalSummary}\n\nKeywords (comma-separated):`,
        max_tokens: 50,
        temperature: 0.3,
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const keywordsText = response.data.choices[0].text.trim();
      const keywords = keywordsText.split(',').map((k: string) => k.trim());
      console.log(`Extracted keywords: ${keywords.join(', ')}`);
      return keywords;
    } catch (error) {
      console.error("Error calling LLM API for keywords:", error);
      return ["error extracting keywords"];
    }
  }
  
  async post(shared: DocumentState, prepRes: unknown, keywords: string[]): Promise<string> {
    // Store keywords in shared state
    shared.keywords = keywords;
    return "complete"; // Special action indicating we're done
  }
}

// Create and connect all nodes in a flow
function createDocumentSummaryFlow() {
  const splitter = new DocumentSplitterNode();
  const chunkSummarizer = new ChunkSummarizerNode();
  const titleGenerator = new TitleGeneratorNode();
  const finalSummarizer = new FinalSummarizerNode();
  const keywordExtractor = new KeywordExtractorNode();
  
  // Connect the nodes with "default" action
  splitter.next(chunkSummarizer);
  chunkSummarizer.next(titleGenerator);
  titleGenerator.next(finalSummarizer);
  finalSummarizer.next(keywordExtractor);
  
  // Create a flow starting with the splitter
  return new Flow(splitter);
}

// Example usage
async function summarizeDocument(text: string) {
  // Initialize the shared state
  const state: DocumentState = {
    originalText: text,
    chunks: [],
    chunkSummaries: [],
    finalSummary: "",
    documentTitle: "",
    keywords: []
  };
  
  // Create and run the flow
  const flow = createDocumentSummaryFlow();
  await flow.run(state);
  
  // Return the results
  return {
    title: state.documentTitle,
    summary: state.finalSummary,
    keywords: state.keywords
  };
}

// Example runner
async function main() {
  const longDocument = `... your long document text here ...`;
  const result = await summarizeDocument(longDocument);
  
  console.log("\n=== DOCUMENT SUMMARIZATION RESULTS ===");
  console.log(`TITLE: ${result.title}`);
  console.log(`\nKEYWORDS: ${result.keywords.join(', ')}`);
  console.log(`\nSUMMARY:\n${result.summary}`);
}

main().catch(console.error);
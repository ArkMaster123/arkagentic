# Multi-Agent Framework Comparison

> **The Problem**: Our current hand-rolled orchestrator approach is hitting limits. We need a proper multi-agent framework that can handle complex routing, agent collaboration, memory, and MCP tool access.

---

## TL;DR Recommendation

| If you want... | Use this |
|----------------|----------|
| Production-ready, AWS-native, great MCP support | **Strands Agents (AWS)** |
| TypeScript/Vercel ecosystem, simple patterns | **AI SDK (Vercel)** |
| Maximum flexibility, graph-based workflows | **LangGraph** |
| Quick prototyping, role-based teams | **CrewAI** |
| Research/experimental, conversational agents | **AutoGen (Microsoft)** |

**My pick for us: Strands Agents** - native MCP, production-ready, Python, model-agnostic.

---

## Framework Comparison Table

| Framework | Language | MCP Support | Multi-Agent Patterns | Complexity | Production Ready | Best For |
|-----------|----------|-------------|---------------------|------------|------------------|----------|
| **Strands Agents (AWS)** | Python | Native | Agents-as-Tools, Swarms, Graphs, Workflows | Medium | Yes | Enterprise, AWS users |
| **AI SDK (Vercel)** | TypeScript | Yes (built-in) | Tool loops, Workflows | Low | Yes | Next.js/Vercel apps |
| **LangGraph** | Python/JS | Via tools | Any graph topology | High | Yes | Complex state machines |
| **CrewAI** | Python | Via tools | Role-based crews | Low | Moderate | Quick prototyping |
| **AutoGen (Microsoft)** | Python | Via tools | Conversational | High | Research | Experimentation |
| **OpenAI Swarm** | Python | No native | Handoffs | Low | No (educational) | Learning concepts |
| **PydanticAI** | Python | Yes | Single agent focus | Low | Yes | Type-safe agents |

---

## 1. Strands Agents (AWS)

**Repository**: https://github.com/strands-agents/sdk-python  
**Docs**: https://strandsagents.com/latest/

### Overview
Open-source SDK from AWS for building production-ready AI agents. Model-driven approach - lets the LLM figure out orchestration rather than hardcoding flows.

### Multi-Agent Patterns Supported

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Agents as Tools** | Wrap agents as callable tools for orchestrator | Specialist delegation |
| **Swarms** | Peer agents with handoffs, shared memory | Brainstorming, iterative refinement |
| **Agent Graphs** | Directed graph of agents | Complex workflows, pipelines |
| **Workflows** | DAG of tasks with dependencies | Document processing, ETL |

### MCP Support
**Native MCP integration** - first-class support for MCP tools.

```python
from strands import Agent
from strands.tools.mcp import MCPClient

# Native MCP client integration
mcp_client = MCPClient(
    command="npx",
    args=["@anthropic/mcp-server-exa"]
)

agent = Agent(
    system_prompt="Research assistant",
    tools=[mcp_client]  # MCP tools just work
)
```

### Code Example: Multi-Agent System

```python
from strands import Agent
from strands.multiagent import Swarm, GraphBuilder

# Define specialized agents
research_agent = Agent(
    name="researcher",
    system_prompt="Research and gather information",
    tools=[web_search, knowledge_base]
)

analyst_agent = Agent(
    name="analyst", 
    system_prompt="Analyze research data",
    tools=[data_analysis]
)

writer_agent = Agent(
    name="writer",
    system_prompt="Create final reports",
    tools=[editor]
)

# Option 1: Swarm (peer collaboration)
swarm = Swarm(
    agents=[research_agent, analyst_agent, writer_agent],
    max_handoffs=2,
    max_iterations=3
)

# Option 2: Graph (explicit flow)
builder = GraphBuilder()
builder.add_node(research_agent, "research")
builder.add_node(analyst_agent, "analysis")
builder.add_node(writer_agent, "report")
builder.add_edge("research", "analysis")
builder.add_edge("analysis", "report")
graph = builder.build()
```

### Pros
- Native AWS/Bedrock integration
- First-class MCP support
- Production testimonials (Smartsheet, Swisscom, Eightcap)
- Model-agnostic (Bedrock, OpenAI, Anthropic, local models)
- Clean Python API with `@tool` decorator
- Built-in observability

### Cons
- Newer framework (less community resources)
- Python only
- Some patterns still evolving

### Verdict
**Best choice for our use case** - native MCP, production-ready, supports all patterns we need.

---

## 2. AI SDK (Vercel)

**Repository**: https://github.com/vercel/ai  
**Docs**: https://ai-sdk.dev/docs/agents/overview

### Overview
Vercel's SDK for building AI applications. Recently added `ToolLoopAgent` class for agentic patterns. TypeScript-first, great for Next.js apps.

### Multi-Agent Patterns

The AI SDK focuses on **single-agent patterns** but provides building blocks:

```typescript
import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

const weatherAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.5",
  tools: {
    weather: tool({
      description: 'Get weather',
      inputSchema: z.object({
        location: z.string()
      }),
      execute: async ({ location }) => ({ temp: 72 })
    })
  }
});

const result = await weatherAgent.generate({
  prompt: 'Weather in SF?'
});
```

### MCP Support
**Built-in MCP support** via `@ai-sdk/mcp`:

```typescript
import { experimental_createMCPClient } from 'ai';

const mcpClient = await experimental_createMCPClient({
  transport: {
    type: 'stdio',
    command: 'npx',
    args: ['@anthropic/mcp-server-exa']
  }
});

const tools = await mcpClient.tools();
```

### Multi-Agent Workarounds
No native multi-agent primitives, but you can build your own:

```typescript
// DIY multi-agent with AI SDK
const orchestrator = new ToolLoopAgent({
  tools: {
    callResearcher: tool({
      execute: async ({ query }) => {
        const researcher = new ToolLoopAgent({ ... });
        return researcher.generate({ prompt: query });
      }
    }),
    callWriter: tool({ ... })
  }
});
```

### Pros
- Excellent TypeScript support
- Great streaming/UI primitives
- Vercel deployment optimized
- Active development
- MCP support built-in

### Cons
- **No native multi-agent patterns** (must build yourself)
- TypeScript only
- Less suited for complex orchestration

### Verdict
Good if we're in TypeScript/Next.js ecosystem, but we'd need to build multi-agent patterns ourselves.

---

## 3. LangGraph

**Repository**: https://github.com/langchain-ai/langgraph  
**Docs**: https://langchain-ai.github.io/langgraph/

### Overview
From LangChain team. Builds agents as state machines/graphs. Maximum flexibility but higher complexity.

### Key Concepts
- **StateGraph**: Define nodes (agents) and edges (transitions)
- **Conditional edges**: Route based on state
- **Checkpointing**: Built-in persistence

```python
from langgraph.graph import StateGraph, END

# Define state
class AgentState(TypedDict):
    messages: list
    next_agent: str

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("researcher", research_node)
workflow.add_node("writer", writer_node)
workflow.add_conditional_edges(
    "researcher",
    should_continue,
    {"continue": "writer", "end": END}
)
```

### MCP Support
Via LangChain tools - not native but possible.

### Pros
- Maximum flexibility
- Great for complex state machines
- Strong community
- Built-in persistence/checkpointing
- LangSmith integration for debugging

### Cons
- Steep learning curve
- Can be over-engineered for simple cases
- Verbose API
- MCP is bolted on, not native

### Verdict
Powerful but might be overkill. Consider if we need very complex conditional flows.

---

## 4. CrewAI

**Repository**: https://github.com/joaomdmoura/crewAI  
**Docs**: https://docs.crewai.com/

### Overview
Role-based multi-agent framework. Define agents with roles, goals, and backstories. They work as a "crew" on tasks.

### Key Concepts

```python
from crewai import Agent, Task, Crew

researcher = Agent(
    role="Senior Research Analyst",
    goal="Find comprehensive information",
    backstory="Expert researcher with 10 years experience",
    tools=[search_tool]
)

writer = Agent(
    role="Content Writer",
    goal="Create engaging content",
    backstory="Award-winning journalist"
)

task = Task(
    description="Research and write about AI agents",
    expected_output="A detailed article",
    agent=researcher
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[task1, task2],
    process=Process.sequential  # or hierarchical
)

result = crew.kickoff()
```

### MCP Support
Via custom tools - not native.

### Pros
- Very intuitive role-based model
- Quick to prototype
- Good documentation
- Active community

### Cons
- Less flexible than graph-based approaches
- Role/backstory prompting can be gimmicky
- MCP not native
- Production readiness concerns

### Verdict
Great for quick prototypes but might hit limits for complex orchestration.

---

## 5. AutoGen (Microsoft)

**Repository**: https://github.com/microsoft/autogen  
**Docs**: https://microsoft.github.io/autogen/

### Overview
Research-oriented framework from Microsoft. Focuses on conversational multi-agent patterns.

### Key Concepts
Agents have conversations to solve problems:

```python
from autogen import AssistantAgent, UserProxyAgent

assistant = AssistantAgent(
    name="assistant",
    llm_config={"model": "gpt-4"}
)

user_proxy = UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    code_execution_config={"work_dir": "coding"}
)

user_proxy.initiate_chat(
    assistant,
    message="Write a Python script"
)
```

### Pros
- Good for research/experimentation
- Strong code execution support
- Microsoft backing

### Cons
- Research-oriented (not production-focused)
- Higher latency (500-800ms)
- Complex setup
- No native MCP

### Verdict
Best for experimentation, not for our production use case.

---

## 6. OpenAI Swarm

**Repository**: https://github.com/openai/swarm

### Overview
**Educational framework** from OpenAI - explicitly NOT for production. Demonstrates lightweight agent coordination concepts.

### Key Concepts
- Agents with instructions and tools
- Handoffs between agents
- Minimal abstraction

```python
from swarm import Swarm, Agent

client = Swarm()

researcher = Agent(
    name="Researcher",
    instructions="You research topics"
)

writer = Agent(
    name="Writer", 
    instructions="You write content"
)

response = client.run(
    agent=researcher,
    messages=[{"role": "user", "content": "Research AI"}]
)
```

### Pros
- Simple to understand
- Good for learning concepts

### Cons
- **Not production ready** (OpenAI says this explicitly)
- No MCP support
- Limited features
- Educational only

### Verdict
Good for learning, not for building our system.

---

## MCP Optimization: The Playwriter Approach

> **This is genius and we should learn from it**

**Repository**: https://github.com/remorses/playwriter

### The Problem with Traditional MCP
Most browser automation MCPs (like Playwright MCP, BrowserMCP) expose **17+ separate tools**:
- `browser_navigate`
- `browser_click`
- `browser_type`
- `browser_screenshot`
- `browser_scroll`
- etc...

**Each tool definition consumes context window** with schemas, descriptions, examples. This forces some frameworks to spawn **subagents** for browser tasks, adding latency.

### Playwriter's Solution: Single `execute` Tool

Instead of 17 tools, Playwriter exposes **ONE tool**:

```javascript
{
  "name": "execute",
  "description": "Execute Playwright code",
  "parameters": {
    "code": "string" // Full Playwright code snippet
  }
}
```

**Why this works:**
1. **LLMs already know Playwright** from training data
2. **90% less context usage** - one tool vs seventeen
3. **More capable** - full Playwright API, not limited subset
4. **No subagent needed** - direct execution

### Before vs After

```
BEFORE (BrowserMCP):
- 17 tool definitions in context
- LLM must learn custom tool schemas
- Limited to predefined actions
- May spawn subagent = latency

AFTER (Playwriter):
- 1 tool definition
- LLM uses existing Playwright knowledge  
- Full API access
- Direct execution
```

### Applying This Pattern to Our MCPs

We could apply the same principle:

**Instead of:**
```javascript
// Multiple granular Exa tools
tools: [
  searchWeb,
  searchNews,
  findSimilar,
  getContents,
  prospectCompany,
  findPeople
]
```

**Consider:**
```javascript
// Single powerful Exa tool
tools: [{
  name: "exa",
  description: "Execute Exa search. Use Exa SDK methods.",
  execute: async (code) => eval(code) // simplified
}]
```

**Tradeoff**: Requires LLM to know the SDK API (Exa is less known than Playwright).

### Key Insight
> "The irony is that by trying to make browser control 'simpler' with dedicated tools, these integrations make it slower, less capable, and waste context window that could be used for actual work."

---

## Recommendation for Our Slack Bot

### Current Pain Points
1. Hand-rolled orchestrator is fragile
2. No proper agent memory/state
3. MCP tools scattered across agents
4. No proper handoff patterns
5. Context bloat from multiple tools

### Proposed Architecture with Strands Agents

```
                    +------------------+
                    |   Slack Event    |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   Orchestrator   |
                    |  (Strands Agent) |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
+--------v-------+  +--------v-------+  +--------v-------+
|     Scout      |  |      Sage      |  |   Chronicle    |
| (Research Agent)|  |(Analysis Agent)|  | (Writer Agent) |
+--------+-------+  +--------+-------+  +--------+-------+
         |                   |                   |
    +----v----+         +----v----+         +----v----+
    |   MCP   |         |   MCP   |         |   MCP   |
    |  (Exa)  |         |  (Exa)  |         |(Exa+Web)|
    +---------+         +---------+         +---------+
```

### Migration Path

1. **Phase 1**: Install Strands, wrap existing agents
2. **Phase 2**: Add proper handoff patterns (Swarm)
3. **Phase 3**: Optimize MCP tools (Playwriter-style consolidation)
4. **Phase 4**: Add proper memory/state management

### Example Refactored Scout Agent

```python
from strands import Agent
from strands.tools.mcp import MCPClient

# Single MCP client for Exa
exa_mcp = MCPClient(
    command="npx",
    args=["@anthropic/mcp-server-exa"]
)

scout_agent = Agent(
    name="scout",
    system_prompt="""You are Scout, a resourceful research specialist.
    Use the Exa tools to find information, research companies, and locate people.
    Be thorough but concise. Always cite sources.""",
    tools=[exa_mcp],
    model=BedrockModel(model_id="anthropic.claude-3-5-sonnet")
)

# Use as tool for orchestrator
@tool
def call_scout(query: str) -> str:
    """Delegate research tasks to Scout agent."""
    return scout_agent(query)
```

---

## Next Steps

1. [ ] Spike: Set up Strands Agents locally
2. [ ] Prototype: Migrate one agent (Scout) to Strands
3. [ ] Test: MCP integration with Strands
4. [ ] Evaluate: Compare performance/reliability
5. [ ] Decide: Full migration or hybrid approach

---

## Resources

- [Strands Agents Docs](https://strandsagents.com/latest/)
- [Strands GitHub](https://github.com/strands-agents/sdk-python)
- [AI SDK Agents Docs](https://ai-sdk.dev/docs/agents/overview)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [Playwriter (MCP optimization)](https://github.com/remorses/playwriter)
- [AWS Multi-Agent Patterns Blog](https://aws.amazon.com/blogs/machine-learning/multi-agent-collaboration-patterns-with-strands-agents-and-amazon-nova/)

---

*Last Updated: December 2024*

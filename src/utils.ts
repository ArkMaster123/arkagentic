export enum DIRECTION {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  let currentIndex = result.length;
  let randomIndex: number;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [result[currentIndex], result[randomIndex]] = [
      result[randomIndex],
      result[currentIndex],
    ];
  }

  return result;
}

// Determine which agents should respond to a query
export function routeQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const agents: string[] = [];

  // Check for research keywords -> Scout
  if (/research|find|search|look up|company|prospect|people|leads/.test(lowerQuery)) {
    agents.push('scout');
  }

  // Check for analysis keywords -> Sage
  if (/analyze|compare|versus|vs|strategy|recommend|should|pros and cons/.test(lowerQuery)) {
    agents.push('sage');
  }

  // Check for article/care keywords -> Chronicle
  if (/article|write|news|cqc|care home|social care|carescope/.test(lowerQuery)) {
    agents.push('chronicle');
  }

  // Check for trends keywords -> Trends
  if (/trending|this week|breaking|keywords|buzz|what's happening/.test(lowerQuery)) {
    agents.push('trends');
  }

  // Check for freelancing/business keywords -> Gandalfius
  if (/freelance|freelancing|pricing|rates?|clients?|proposal|scope|hourly|value.based|contract|charge|business|entrelancer|raise rates|budget/.test(lowerQuery)) {
    agents.push('gandalfius');
  }

  // Default to Maven if no specific agent matched
  if (agents.length === 0) {
    agents.push('maven');
  }

  return agents;
}

// Calculate distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

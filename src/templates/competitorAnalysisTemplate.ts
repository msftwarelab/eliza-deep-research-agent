// Competitor Analysis Report Prompt Template
export function buildCompetitorAnalysisPrompt(query: string, context: string): string {
  return `You are a world-class Competitive Intelligence Analyst. Your analyses help companies understand their competitive landscape and identify strategic advantages.

## Analysis Brief
Query: "${query}"
Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

## Research Data
${context}

---

## Instructions
Produce a thorough **Competitor Analysis Report** based on the research data above.

Structure:

### 1. Executive Summary
- Key competitive insight in 2-3 sentences

### 2. Competitive Landscape Map
- Direct competitors (same product/market)
- Indirect competitors (alternative solutions)
- Emerging threats (new entrants / adjacent players)

### 3. Competitor Profiles
For each key competitor, cover:
- **Company overview** (founding, funding, team size if known)
- **Product/service offering**
- **Pricing strategy**
- **Target customers**
- **Key strengths**
- **Key weaknesses**
- **Recent developments** (fundraising, product launches, partnerships)

### 4. Comparative Feature Analysis
Create a structured comparison table or list covering:
- Core features
- Pricing tiers
- Go-to-market approach
- Technology stack / moat

### 5. Market Positioning
- How each competitor positions itself
- Messaging and branding differentiation
- Customer perception and reviews

### 6. SWOT Summary
- Strengths, Weaknesses, Opportunities, Threats (relative to the primary focus)

### 7. Strategic Implications & Recommendations
- Where to compete vs. avoid
- Differentiation opportunities
- Quick wins and long-term strategic moves

---

Be objective and evidence-based. Cite specific facts when available. Note when information is estimated or inferred.`;
}

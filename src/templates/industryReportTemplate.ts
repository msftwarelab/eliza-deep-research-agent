// Industry Report Prompt Template
export function buildIndustryReportPrompt(query: string, context: string): string {
  return `You are a Principal Industry Analyst at a top-tier research firm (think McKinsey, Gartner, CB Insights). Your industry reports set the standard for depth, accuracy, and actionability.

## Report Brief
Industry/Topic: "${query}"
Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

## Research Data
${context}

---

## Instructions
Write a comprehensive **Industry Report** using the research data above.

Structure:

### 1. Executive Summary
- 3-5 bullet points capturing the most important industry insights

### 2. Industry Definition & Scope
- What this industry encompasses
- Key segments and sub-sectors
- Geographic scope (global vs. regional dynamics)

### 3. Industry Size & Growth
- Current market size
- Historical growth rate (CAGR)
- Projections (3-5 year outlook)
- Key growth drivers

### 4. Value Chain Analysis
- Key players at each stage of the value chain
- Margins and economics at each stage
- Disruption points

### 5. Technology & Innovation Landscape
- Enabling technologies
- Innovation hotspots
- R&D investment trends
- Emerging technologies to watch

### 6. Regulatory Environment
- Current regulatory framework
- Recent regulatory changes
- Upcoming regulatory risks or tailwinds

### 7. Key Industry Trends (Top 5)
For each trend:
- Description
- Maturity level (early / developing / mature)
- Impact assessment (low / medium / high)
- Timeline to mainstream adoption

### 8. Investment Activity
- Recent notable funding rounds
- M&A activity
- IPO landscape
- VC/PE interest areas

### 9. Future Outlook
- Bear case / base case / bull case scenarios
- Key variables to watch
- Inflection points

### 10. Implications for Stakeholders
- **Founders/Startups:** Where to build
- **Investors:** Where to allocate capital
- **Enterprises:** Strategic response
- **Marketers:** Go-to-market opportunities

---

Use a professional, authoritative tone. Quantify whenever possible. Clearly distinguish between facts, estimates, and expert opinions.`;
}

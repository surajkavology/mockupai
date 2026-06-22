require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

/* Serve frontend static files */
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MockupAI backend is running' });
});

app.post('/generate', async (req, res) => {
  const { businessName, industry, description, audience, goal, brandColor } = req.body;

  if (!businessName || !industry || !description) {
    return res.status(400).json({ error: 'businessName, industry, and description are required' });
  }

  const systemPrompt = `You are a world-class creative team — a senior UI/UX designer, award-winning copywriter, branding expert, and conversion strategist — all in one. Your design sensibility is inspired by Apple, Stripe, Linear, Framer, and Airbnb. You write copy that is bold, specific, human, and conversion-focused. You never write cliches like "Welcome to our website", "Best in class", "We are passionate about", or "Your success is our mission". Every word earns its place.`;

  const userPrompt = `Generate a premium website mockup for this business. Think deeply about the brand personality, the target audience psychology, and what makes this business unique before writing a single word.

BUSINESS BRIEF:
- Name: ${businessName}
- Industry: ${industry}
- Description: ${description}
- Target Audience: ${audience || 'General public'}
- Primary Goal: ${goal || 'Increase brand awareness'}
- Brand Color Hint: ${brandColor || '#6366f1'}

CREATIVE DIRECTION:
- Hero headline: Powerful, 5-9 words. Evokes emotion or curiosity. NOT a description of the business.
- Subheadline: 1-2 sentences. Specific benefit, not vague promise.
- Features: Must be INDUSTRY-SPECIFIC. Not "Fast & Reliable" or "24/7 Support". Real capabilities this type of business actually offers.
- Testimonials: Sound like real humans. Include specific details, numbers, or outcomes. Different personas.
- FAQ: Answer real objections buyers have. Be honest and direct.
- CTA text: Action-oriented and specific. e.g. "Start Your Free Trial", "Book a Free Consult", "See It In Action".
- Typography: Suggest font pairings from Google Fonts that match the brand personality.
- Color palette: Choose colors that psychologically fit the industry. Dark must be very dark (#0d1117 range). Light must be very light (#f5f7ff range).
- Design notes: Specific thoughts on whitespace, layout rhythm, and visual hierarchy.

NAVBAR RULES — CRITICAL:
- Links must reflect what THIS SPECIFIC business actually has (menu pages, booking flows, service categories).
- NEVER use: "Home", "About", "Services", "Contact" as all 4 links — these are placeholders, not real nav.
- Industry examples:
  * Restaurant/Cafe → ["Menu", "Reservations", "Catering", "Locations"]
  * Dental Clinic   → ["Treatments", "Smile Gallery", "Insurance", "Book Appointment"]
  * SaaS / Tech     → ["Features", "Pricing", "Docs", "Login"]
  * Fitness Studio  → ["Classes", "Personal Training", "Nutrition", "Join Now"]
  * Law Firm        → ["Practice Areas", "Attorneys", "Case Results", "Free Consultation"]
  * Real Estate     → ["Buy", "Sell", "Properties", "Find an Agent"]
  * E-Commerce      → ["Shop", "New Arrivals", "Sale", "Track Order"]
  * Healthcare      → ["Services", "Doctors", "Patient Portal", "Book Visit"]
  * Education       → ["Courses", "Instructors", "Outcomes", "Enroll"]
  * Travel Agency   → ["Destinations", "Packages", "Experiences", "Plan My Trip"]
- Derive the right links from the business description. Make them sound like real website sections.

FOOTER TAGLINE RULES — CRITICAL:
- Must be a short brand promise (5-10 words max). Poetic, memorable, specific to the industry.
- NEVER repeat the hero tagline or business name.
- NEVER use: "Your success is our mission", "We care about you", "Quality service you can trust"
- Industry examples:
  * Restaurant  → "Fresh ingredients. Crafted experiences."
  * Dental      → "Healthy smiles for every generation."
  * SaaS        → "Build faster. Scale smarter."
  * Fitness     → "Strong bodies. Stronger minds."
  * Law Firm    → "Justice delivered. Results guaranteed."
  * Real Estate → "Find the home you deserve."
  * Education   → "Learn today. Lead tomorrow."
  * Finance     → "Your wealth, engineered for growth."
  * Healthcare  → "Care that never stops."
  * Travel      → "The world is closer than you think."

RULES:
- NEVER output: "Welcome to", "We are passionate", "Best in class", "World-class", "One-stop solution", "Wide range of services"
- Feature icons MUST be a single real emoji character (not a word)
- navbar.links MUST be a JSON array of exactly 4 strings — industry-specific, never all generic
- features MUST be a JSON array of 6 objects each with icon, title, description
- testimonials MUST be a JSON array of 3 objects each with name, role, avatar, text, rating
- faq MUST be a JSON array of 4 objects each with q and a
- about.highlightStat1, highlightStat2, highlightStat3 MUST each be an object with value and label
- All hex colors must start with #
- Reply with ONLY a valid JSON object. No markdown. No explanation. Start with { end with }

JSON SCHEMA:
{"businessName":"","tagline":"","brandPersonality":"","industry":"","brandColor":"","navbar":{"logo":"","links":["","","",""]},"hero":{"headline":"","subheadline":"","ctaPrimary":"","ctaSecondary":"","socialProof":""},"features":[{"icon":"","title":"","description":""},{"icon":"","title":"","description":""},{"icon":"","title":"","description":""},{"icon":"","title":"","description":""},{"icon":"","title":"","description":""},{"icon":"","title":"","description":""}],"about":{"heading":"","body":"","highlightStat1":{"value":"","label":""},"highlightStat2":{"value":"","label":""},"highlightStat3":{"value":"","label":""}},"testimonials":[{"name":"","role":"","avatar":"","text":"","rating":5},{"name":"","role":"","avatar":"","text":"","rating":5},{"name":"","role":"","avatar":"","text":"","rating":5}],"faq":[{"q":"","a":""},{"q":"","a":""},{"q":"","a":""},{"q":"","a":""}],"contact":{"heading":"","subtext":"","email":"","phone":""},"footer":{"tagline":"","year":2026},"colorPalette":{"primary":"","secondary":"","accent":"","dark":"","light":""},"typography":{"heading":"","body":"","style":""},"iconStyle":"","designNotes":"","seoMeta":{"title":"","description":""}}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 3000,
      }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(json));

    const raw = json.choices[0].message.content.trim();
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    const jsonStr = raw.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonStr);

    res.json({ success: true, data });
  } catch (err) {
    console.error('Generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate mockup', details: err.message });
  }
});

/* Fallback — serve index.html for any non-API route */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`MockupAI backend running on http://localhost:${PORT}`);
});

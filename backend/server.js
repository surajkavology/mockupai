require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MockupAI backend is running' });
});

app.post('/generate', async (req, res) => {
  const { businessName, industry, description, audience, goal, brandColor } = req.body;

  if (!businessName || !industry || !description) {
    return res.status(400).json({ error: 'businessName, industry, and description are required' });
  }

  const prompt = `You are an expert web designer and copywriter. Generate a complete website mockup content for the following business.

Business Details:
- Business Name: ${businessName}
- Industry: ${industry}
- Description: ${description}
- Target Audience: ${audience || 'General public'}
- Primary Goal: ${goal || 'Increase brand awareness'}
- Brand Color: ${brandColor || '#6366f1'}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "businessName": "string",
  "tagline": "string (compelling 8-12 word tagline)",
  "industry": "string",
  "brandColor": "string (hex color)",
  "navbar": {
    "logo": "string (business name or abbreviation)",
    "links": ["Home", "About", "Services", "Contact"]
  },
  "hero": {
    "headline": "string (powerful 5-10 word headline)",
    "subheadline": "string (2-3 sentence compelling subheadline)",
    "ctaPrimary": "string (primary CTA button text)",
    "ctaSecondary": "string (secondary CTA text)"
  },
  "features": [
    {
      "icon": "string (single relevant emoji)",
      "title": "string",
      "description": "string (2 sentences)"
    },
    {
      "icon": "string (single relevant emoji)",
      "title": "string",
      "description": "string (2 sentences)"
    },
    {
      "icon": "string (single relevant emoji)",
      "title": "string",
      "description": "string (2 sentences)"
    },
    {
      "icon": "string (single relevant emoji)",
      "title": "string",
      "description": "string (2 sentences)"
    },
    {
      "icon": "string (single relevant emoji)",
      "title": "string",
      "description": "string (2 sentences)"
    },
    {
      "icon": "string (single relevant emoji)",
      "title": "string",
      "description": "string (2 sentences)"
    }
  ],
  "about": {
    "heading": "string",
    "body": "string (3-4 sentences about the business)"
  },
  "testimonials": [
    {
      "name": "string (realistic name)",
      "role": "string (job title or descriptor)",
      "text": "string (2-3 sentence testimonial)"
    },
    {
      "name": "string",
      "role": "string",
      "text": "string"
    },
    {
      "name": "string",
      "role": "string",
      "text": "string"
    }
  ],
  "contact": {
    "heading": "string",
    "subtext": "string",
    "email": "string (realistic placeholder email)",
    "phone": "string (realistic placeholder phone)"
  },
  "footer": {
    "tagline": "string (short footer tagline)",
    "year": 2026
  },
  "colorPalette": {
    "primary": "string (hex - the brand color)",
    "secondary": "string (hex - complementary color)",
    "accent": "string (hex - accent color)",
    "dark": "string (hex - dark shade of brand color)",
    "light": "string (hex - light tint of brand color)"
  },
  "seoMeta": {
    "title": "string (SEO page title)",
    "description": "string (SEO meta description, 150-160 chars)"
  }
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim();
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

app.listen(PORT, () => {
  console.log(`MockupAI backend running on http://localhost:${PORT}`);
});

# Gemini image editing and search grounding — reference notes

Paraphrased from aistudio.google.com docs (image-generation, models/gemini-4-*, models/gemini-nano-banana-2.1, google-search), fetched 2026-11-21.

## Gemini 4 cannot output images
- Gemini 4 models: `gemini-4-carbon`, `gemini-4-argon`, `gemini-4-neon`, `gemini-4-hydrogen`. Input text/image/video/audio/PDF, **output text only**. Image generation: not supported.
- All four support Google Search grounding.

## Image editing: Nano Banana 2.1
- Model ID `gemini-nano-banana-2.1`. Input text + images (up to 14 reference images). Output image + text. Described as the main model for image generation and conversational editing.
- Lower latency with thinking level `minimal`. Images carry a SynthID watermark.
- Lighter option: `gemini-3.1-flash-lite-image` (fastest/cheapest, weaker at multi-reference editing).

### generateContent (JS, @google/genai)
```ts
const response = await ai.models.generateContent({
  model: "gemini-nano-banana-2.1",
  contents: [
    { text: "Add a stainless steel grab bar on the wall next to the toilet. Keep everything else identical." },
    { inlineData: { mimeType: "image/jpeg", data: base64Photo } },
  ],
  config: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { imageSize: "1K" } },
});
const img = response.candidates[0].content.parts.find(p => p.inlineData && !p.thought);
// img.inlineData.data = base64, img.inlineData.mimeType = "image/png"
```
REST: `POST https://generativelanguage.googleapis.com/v1/models/gemini-nano-banana-2.1:generateContent`, header `x-goog-api-key`.

### Interactions API (newer default)
`POST https://generativelanguage.googleapis.com/v1beta/interactions`, headers `x-goog-api-key`, `Api-Revision: 2026-05-20`.
JS: `ai.interactions.create({ model, input: [{type:"text",text}, {type:"image",mime_type:"image/jpeg",data}] })` then `interaction.output_image.data`.

## Google Search grounding (Gemini 4)
- Interactions API: `tools: [{ type: "google_search" }]`. generateContent: `tools: [{ googleSearch: {} }]` (JS).
- Grounded output includes `url_citation` annotations (title, url) — keep these to cite price sources.
- Limit: 1,500 grounded requests/day/project; 5,000 free/month then $14 per 1,000.

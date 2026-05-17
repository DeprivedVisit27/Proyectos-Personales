require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;

const PROMPT = `Futuristic dark hero background for a SaaS landing page. Ultra-dark near-black background (#0a0a0f).
Center composition: a large holographic screen displaying a beautiful modern landing page being constructed in real-time by an AI — UI components floating into place with glowing neon trails.
Surrounding: floating 3D interface panels, holographic code streams, particle effects, subtle digital grid lines on the floor reflecting neon light.
Color palette: near-black background, electric cyan (#00f5ff) glow, neon purple (#8b00ff), subtle green accents.
Top-left corner: a minimalist circular logo mark with horizontal sound-wave lines inside (like Spotify's iconography style) rendered in electric cyan/teal neon glow. This represents an AI web developer's personal brand.
Overall aesthetic: cyberpunk meets clean SaaS design — ultra-modern, dark, cinematic, professional.
Style: photorealistic 3D render, cinematic lighting, volumetric light rays, depth of field.
Aspect ratio: 16:9 wide landscape, high resolution, suitable as website hero section background.`;

function generateImage(prompt, outputFile) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`API Error: ${json.error.message}`));
            return;
          }
          const parts = json.candidates?.[0]?.content?.parts ?? [];
          const imgPart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
          if (!imgPart) {
            reject(new Error('No image data in response: ' + JSON.stringify(json).slice(0, 300)));
            return;
          }
          fs.writeFileSync(outputFile, Buffer.from(imgPart.inlineData.data, 'base64'));
          console.log(`✅ Imagen guardada: ${outputFile}`);
          resolve(outputFile);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const outDir = path.join(__dirname, 'public', 'img');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('🎨 Generando hero background para web...');
  await generateImage(PROMPT, path.join(outDir, 'hero-futurista.png'));

  console.log('🎨 Generando versión para redes sociales...');
  const promptSocial = PROMPT + '\nComposition optimized for 1200x630 social media preview card format.';
  await generateImage(promptSocial, path.join(outDir, 'hero-social.png'));

  console.log('\n🚀 Listo! Imágenes en public/img/');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

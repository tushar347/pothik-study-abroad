# Asset map

Bundled images are served from `public/assets/` and the mappings used by the UI are stored in `content/site-content.json`. Pixel dimensions have not been verified in this inventory; check the actual image before preparing crops or replacements.

| Asset | Intended use | Mapping |
|---|---|---|
| `public/assets/brand/pothik-logo.png` | Header/footer brand mark and favicon | `brand.logo` |
| `public/assets/countries/germany.webp` | Germany destination feature/card and default hero | `countries[germany].image`, `hero.image` |
| `public/assets/countries/canada.webp` | Canada destination feature/card | `countries[canada].image` |
| `public/assets/countries/usa.webp` | United States destination feature/card | `countries[usa].image` |
| `public/assets/countries/uk.webp` | United Kingdom destination feature/card | `countries[uk].image` |
| `public/assets/countries/australia.webp` | Australia destination feature/card | `countries[australia].image` |
| `public/assets/ielts/reading.webp` | IELTS Reading card | `ielts[reading].image` |
| `public/assets/ielts/writing.webp` | IELTS Writing card | `ielts[writing].image` |
| `public/assets/ielts/listening.webp` | IELTS Listening card | `ielts[listening].image` |
| `public/assets/ielts/speaking.webp` | IELTS Speaking card | `ielts[speaking].image` |

The destination images include illustrative flag treatments; they are product artwork, not official government imagery. The `docs/*image-sheet.jpg` files are references, not assets loaded by the website.

## Replace an image

1. Keep the replacement file in an appropriate subfolder under `public/assets/` and use a licensed/owned image.
2. Update the corresponding path and alt text in `content/site-content.json`, or sign in as an administrator and use the Admin workspace upload and image-target controls.
3. The upload form only accepts one PNG/JPEG/WebP up to 6 MB by extension and declared MIME type. Uploaded assets are publicly served from `public/uploads/`; do not upload private material.
4. Reload the page and confirm the image, responsive crop and descriptive alt text.

Keep original bundled image files under source control. Runtime uploads and their paths/config edits should be backed up before publishing; uploads are ignored by Git except for `public/uploads/.gitkeep`.

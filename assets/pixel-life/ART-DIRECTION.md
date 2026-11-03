# Simple pixel art assets

All raster artwork was created and revised with the built-in image generation tool.

## Final style
Redraw each object as a very small hand-placed 16–24 logical pixel sprite. Use large solid square pixel clusters, a simple silhouette, about five flat colors per object, a dark outline and a single shadow. Omit tiny leaf veins, thin roots, scales, intricate patterns, bloom, glossy highlights, gradients, dithering and anti-aliasing. Preserve species identities and exact row-major atlas cell positions. Keep transparent gaps between sprites. The goal is a modest handcrafted handheld farming game appearance rather than a finely rendered illustration.

## Atlas layouts
- crops-normal.png: 4 columns × 4 rows. g1–g16 in row-major order.
- crops-rare.png: 4 columns × 3 rows. g17–g28 in row-major order.
- crops-mythic.png: 4 columns × 3 rows. g29–g40 in row-major order.
- fish.png: 6 columns × 3 rows. FISHES array order (18 species).
- growth.png: 4 columns × 2 rows. Empty soil; planted seeds; sprout; young plant; water droplet; harvest sparkle; fertilizer sack; sickle.
- festival.png: 4 columns × 2 rows. Goldfish; intact paper scoop; torn paper scoop; wooden target; red lantern; victory stars; arrow; reward tokens.

Each sprite uses its own cell through CSS background positioning. No external image-hosting service is required.

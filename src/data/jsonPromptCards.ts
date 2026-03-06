export type JsonPromptCardField = {
  key: string;
  label: string;
  placeholder: string;
};

export type JsonPromptCard = {
  id: string;
  label: string;
  description: string;
  outputType: "json" | "image-prompt" | "ad-copy";
  fields: JsonPromptCardField[];
};

export const JSON_PROMPT_CARDS: JsonPromptCard[] = [
  {
    id: "football-player-image",
    label: "Football Player Image",
    description: "Photoreal football shot with jersey and match context.",
    outputType: "image-prompt",
    fields: [
      { key: "player_name", label: "Player Name", placeholder: "e.g. Mason Cole" },
      { key: "club", label: "Club", placeholder: "e.g. Manchester City style kit" },
      { key: "shirt_name", label: "Shirt Name", placeholder: "e.g. COLE" },
      { key: "shirt_number", label: "Shirt Number", placeholder: "e.g. 11" },
      { key: "hair_color", label: "Hair Color", placeholder: "e.g. dark brown" },
      { key: "clothing_details", label: "Kit Details", placeholder: "e.g. long sleeves, white boots" },
      { key: "action", label: "Action", placeholder: "e.g. volley shot in penalty area" },
      { key: "stadium", label: "Stadium", placeholder: "e.g. night game, packed crowd" },
      { key: "lighting", label: "Lighting", placeholder: "e.g. cinematic floodlights" },
      { key: "camera_style", label: "Camera Style", placeholder: "e.g. low angle 85mm sports photo" },
    ],
  },
  {
    id: "youtube-thumbnail",
    label: "YouTube Thumbnail",
    description: "High CTR thumbnail prompt with text, subject, and color controls.",
    outputType: "image-prompt",
    fields: [
      { key: "video_topic", label: "Video Topic", placeholder: "e.g. AI side hustles in 2026" },
      { key: "headline_text", label: "Headline Text", placeholder: "e.g. STOP WASTING TOKENS" },
      { key: "subject_look", label: "Subject Look", placeholder: "e.g. shocked expression, eye contact" },
      { key: "hair_color", label: "Hair Color", placeholder: "e.g. black with blue streaks" },
      { key: "clothing", label: "Clothing", placeholder: "e.g. black hoodie with gold accents" },
      { key: "background", label: "Background", placeholder: "e.g. neon studio with charts" },
      { key: "color_palette", label: "Color Palette", placeholder: "e.g. black, gold, cyan" },
      { key: "composition", label: "Composition", placeholder: "e.g. subject left, text right" },
    ],
  },
  {
    id: "techno-organic-cityscape",
    label: "Techno-Organic Cityscape",
    description: "Surreal city transformation with biomechanical architecture, weather, and palette controls.",
    outputType: "image-prompt",
    fields: [
      { key: "city_name", label: "City Name", placeholder: "e.g. London" },
      { key: "weather", label: "Weather", placeholder: "e.g. rainy overcast weather" },
      { key: "scene_structure", label: "Scene Structure", placeholder: "e.g. street looping into a vertical overhead city arc" },
      { key: "landmarks", label: "Landmarks", placeholder: "e.g. Big Ben, London towers, bridges" },
      { key: "tech_forms", label: "Tech Forms", placeholder: "e.g. flowing circuitry, biomechanical roots, cable-veins" },
      { key: "organic_forms", label: "Organic Forms", placeholder: "e.g. root-like growth, skeletal arches, living metallic tendrils" },
      { key: "color_palette", label: "Color Palette", placeholder: "e.g. gold and black" },
      { key: "street_details", label: "Street Details", placeholder: "e.g. wet asphalt, reflections, cars, umbrellas" },
      { key: "lighting", label: "Lighting", placeholder: "e.g. moody rainy-day light with gold glow" },
      { key: "render_style", label: "Render Style", placeholder: "e.g. photorealistic, ultra-detailed, cinematic realism, 8k" },
    ],
  },
  {
    id: "product-ad-copy",
    label: "Product Ad Copy",
    description: "Conversion-focused ad prompt with strict offer and CTA structure.",
    outputType: "ad-copy",
    fields: [
      { key: "product_name", label: "Product Name", placeholder: "e.g. Dunamis Prompt Pack" },
      { key: "audience", label: "Audience", placeholder: "e.g. creators and marketers" },
      { key: "problem", label: "Core Problem", placeholder: "e.g. weak prompts waste time" },
      { key: "benefit", label: "Main Benefit", placeholder: "e.g. cleaner outputs in one click" },
      { key: "offer", label: "Offer", placeholder: "e.g. 20% off first month" },
      { key: "cta", label: "CTA", placeholder: "e.g. Start now" },
      { key: "tone", label: "Tone", placeholder: "e.g. direct and confident" },
    ],
  },
  {
    id: "chat-json-task",
    label: "Chat JSON Task",
    description: "Structured task payload for chat model execution.",
    outputType: "json",
    fields: [
      { key: "role", label: "Role", placeholder: "e.g. Senior growth strategist" },
      { key: "objective", label: "Objective", placeholder: "e.g. Build a 30-day launch plan" },
      { key: "audience", label: "Audience", placeholder: "e.g. solo creators selling digital products" },
      { key: "context", label: "Context", placeholder: "e.g. low budget, no paid ads yet" },
      { key: "constraints", label: "Constraints", placeholder: "e.g. no fluff, no legal claims" },
      { key: "output_schema", label: "Output Schema", placeholder: "e.g. phases, tasks, KPIs, checklist" },
    ],
  },
  {
    id: "cinema-selfie-scene",
    label: "Character Selfie Scene",
    description: "Nested JSON scene prompt with characters, scene metadata, interaction, and style.",
    outputType: "json",
    fields: [
      { key: "character_1_name", label: "Character 1 Name", placeholder: "e.g. Miyeon" },
      { key: "character_1_description", label: "Character 1 Description", placeholder: "e.g. beautiful young Korean woman..." },
      { key: "character_2_name", label: "Character 2 Name", placeholder: "e.g. Judy Hopps" },
      { key: "character_2_description", label: "Character 2 Description", placeholder: "e.g. Disney character from Zootopia..." },
      { key: "location", label: "Location", placeholder: "e.g. slightly dark, crowded cinema hall" },
      { key: "background", label: "Background", placeholder: "e.g. giant movie screen with action scene" },
      { key: "lighting", label: "Lighting", placeholder: "e.g. cinematic lighting" },
      { key: "interaction", label: "Interaction", placeholder: "e.g. taking a selfie side-by-side" },
      { key: "style", label: "Style", placeholder: "e.g. photorealistic, ultra-detailed, 8K" },
    ],
  },
  {
    id: "mirror-selfie-2000s",
    label: "2000s Mirror Selfie",
    description: "Detailed nested selfie JSON with fashion, accessories, room, and shoe color controls.",
    outputType: "json",
    fields: [
      { key: "request_text", label: "Request Text", placeholder: "e.g. Create a 2000s Mirror Selfie of yourself using Gemini Nano Banana." },
      { key: "subject_description", label: "Subject Description", placeholder: "e.g. A young woman taking a mirror selfie..." },
      { key: "age", label: "Age", placeholder: "e.g. young adult" },
      { key: "expression", label: "Expression", placeholder: "e.g. confident and slightly playful" },
      { key: "hair_color", label: "Hair Color", placeholder: "e.g. dark" },
      { key: "hair_style", label: "Hair Style", placeholder: "e.g. very long, voluminous waves with soft wispy bangs" },
      { key: "top_type", label: "Top Type", placeholder: "e.g. fitted cropped t-shirt" },
      { key: "top_color", label: "Top Color", placeholder: "e.g. cream white" },
      { key: "top_details", label: "Top Details", placeholder: "e.g. anime-style cat face graphic..." },
      { key: "shoe_type", label: "Shoe Type", placeholder: "e.g. chunky sneakers" },
      { key: "shoe_primary_color", label: "Shoe Primary Color", placeholder: "e.g. white" },
      { key: "shoe_secondary_color", label: "Shoe Secondary Color", placeholder: "e.g. baby pink accents" },
      { key: "shoe_laces_color", label: "Shoe Laces Color", placeholder: "e.g. silver" },
      { key: "makeup", label: "Makeup", placeholder: "e.g. natural glam with dewy blush and glossy red lips" },
      { key: "earrings", label: "Earrings", placeholder: "e.g. gold geometric hoop earrings" },
      { key: "waistchain", label: "Waistchain", placeholder: "e.g. silver waistchain" },
      { key: "phone_type", label: "Phone Type", placeholder: "e.g. smartphone" },
      { key: "phone_details", label: "Phone Details", placeholder: "e.g. patterned case" },
      { key: "camera_style", label: "Camera Style", placeholder: "e.g. early-2000s digital camera aesthetic" },
      { key: "photo_lighting", label: "Photo Lighting", placeholder: "e.g. harsh super-flash with blown-out highlights" },
      { key: "angle", label: "Angle", placeholder: "e.g. mirror selfie" },
      { key: "shot_type", label: "Shot Type", placeholder: "e.g. tight selfie composition" },
      { key: "texture", label: "Texture", placeholder: "e.g. subtle grain, retro highlights, crisp details" },
      { key: "setting", label: "Setting", placeholder: "e.g. nostalgic early-2000s bedroom" },
      { key: "wall_color", label: "Wall Color", placeholder: "e.g. pastel tones" },
      { key: "background_elements", label: "Background Elements", placeholder: "e.g. chunky wooden dresser, CD player, pop-icon posters" },
      { key: "atmosphere", label: "Atmosphere", placeholder: "e.g. authentic 2000s nostalgic vibe" },
      { key: "background_lighting", label: "Background Lighting", placeholder: "e.g. retro" },
    ],
  },
  {
    id: "style-mode-image-director",
    label: "Style Mode Image Director",
    description: "Turn short image ideas into high-quality expanded prompts using CINEMA, STUDIO, or ART mode.",
    outputType: "json",
    fields: [
      { key: "mode", label: "Mode", placeholder: "CINEMA (default), STUDIO, or ART" },
      { key: "user_prompt", label: "User Prompt", placeholder: "e.g. glass lion" },
      { key: "output_description", label: "Output Description", placeholder: "e.g. Generate one fully expanded, high-quality image..." },
    ],
  },
];

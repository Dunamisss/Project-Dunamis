export interface ImageLibraryItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  full: string;
  thumb: string;
}

export const IMAGE_LIBRARY: ImageLibraryItem[] = [
  {
    "id": "forest-witch-4338db27",
    "title": "forest witch",
    "description": "Original artwork: forest witch.",
    "tags": [
      "forest",
      "witch"
    ],
    "full": "/images/library/full/forest-witch-4338db27.webp",
    "thumb": "/images/library/thumbs/forest-witch-4338db27.webp"
  },
  {
    "id": "glass-apple-d7f4d6ca",
    "title": "Glass Apple",
    "description": "Original artwork: Glass Apple.",
    "tags": [
      "glass",
      "apple"
    ],
    "full": "/images/library/full/glass-apple-d7f4d6ca.webp",
    "thumb": "/images/library/thumbs/glass-apple-d7f4d6ca.webp"
  }
];

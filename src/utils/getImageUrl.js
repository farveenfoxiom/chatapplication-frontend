import { API_BASE_URL } from "../config";

export function getImageUrl(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `${API_BASE_URL}${image}`;
}
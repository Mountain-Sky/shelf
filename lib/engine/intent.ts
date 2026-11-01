import type { Intent } from "../types";
export function interpret(message: string): Intent {
  if (/available|on the shelf|in stock|pick up/i.test(message))
    return "availability";
  if (
    /^(find|where is|do you have|search for)\b|\bISBN\b|^\d{10,13}$/i.test(
      message,
    )
  )
    return "known_item";
  if (
    /recommend|something like|similar|more like|next|mood|loved|enjoyed/i.test(
      message,
    )
  )
    return "recommendation";
  return "exploration";
}

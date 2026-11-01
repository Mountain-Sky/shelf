import type { Intent } from "../types";
export function interpret(
  message: string,
  previousQuery = "",
): { intent: Intent; refinement: boolean; query: string } {
  const refinement =
    Boolean(previousQuery) &&
    /^(more|less|only|but|something|what about|show me|make it|instead|these|those)\b/i.test(
      message,
    );
  const intent: Intent = /available|on the shelf|in stock|pick up/i.test(
    message,
  )
    ? "availability"
    : /^(find|where is|do you have|search for)\b/i.test(message)
      ? "known_item"
      : /recommend|something like|similar|next|mood|loved|enjoyed/i.test(
            message,
          )
        ? "recommendation"
        : "exploration";
  return {
    intent,
    refinement,
    query: refinement ? `${previousQuery} ${message}`.slice(-1000) : message,
  };
}

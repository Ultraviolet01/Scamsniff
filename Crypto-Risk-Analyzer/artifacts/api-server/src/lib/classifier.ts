/**
 * Input classifier for ScamSniff.
 * Detects whether the user typed an X handle, a URL, a token ticker, or a project name.
 */

export type InputType =
  | "x_handle"
  | "website_url"
  | "token_name"
  | "project_name"
  | "unknown";

/**
 * Classify the raw user input into one of the known input types.
 *
 * Rules:
 * - x_handle  : starts with "@" or is a twitter/x.com profile URL
 * - website_url: starts with http:// or https://
 * - token_name : all-caps 2–10 char ticker, optionally prefixed with "$"
 * - project_name: anything else with at least one alphabetic character
 * - unknown   : everything else
 */
export function classifyInput(input: string): InputType {
  const trimmed = input.trim();

  if (!trimmed) return "unknown";

  if (
    /^@\w+/.test(trimmed) ||
    /^https?:\/\/(www\.)?(twitter|x)\.com\//i.test(trimmed)
  ) {
    return "x_handle";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return "website_url";
  }

  if (/^\$?[A-Z]{2,10}$/.test(trimmed)) {
    return "token_name";
  }

  if (/[a-zA-Z]/.test(trimmed)) {
    return "project_name";
  }

  return "unknown";
}

/**
 * Build the best display label for the "missing signals" panel.
 */
export function missingSignalsLabel(type: InputType): string {
  switch (type) {
    case "x_handle":
      return "Unverified Links";
    case "website_url":
      return "Missing Trust Elements";
    default:
      return "Missing Signals";
  }
}

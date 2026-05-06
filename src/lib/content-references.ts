export function extractMentionKeys(body: string) {
  return Array.from(body.matchAll(/@([a-zA-Z0-9_-](?:[a-zA-Z0-9._-]*[a-zA-Z0-9_-])?)/g))
    .map((match) => match[1]?.toLowerCase())
    .filter(Boolean);
}

export function slugifyTaskTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractTaskRefs(body: string) {
  return Array.from(body.matchAll(/#([a-zA-Z0-9_-]+)/g))
    .map((match) => match[1]?.toLowerCase())
    .filter(Boolean);
}

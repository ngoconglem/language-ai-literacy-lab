import type { Essay } from "./data";
import { BAND_LABEL, CONDITION_LABEL } from "./data";

export interface GroupDef {
  key: string;
  label: string;
  filter: (e: Essay) => boolean;
}

export const GROUPS: GroupDef[] = [
  { key: "learners", label: "Learners, all", filter: (e) => e.source === "human" },
  ...(["lower", "middle", "higher"] as const).map((b) => ({
    key: `learners-${b}`,
    label: `Learners, ${BAND_LABEL[b].toLowerCase()}`,
    filter: (e: Essay) => e.source === "human" && e.band === b,
  })),
  { key: "model", label: "Model, all conditions", filter: (e) => e.source === "llm" },
  ...Object.entries(CONDITION_LABEL).map(([k, v]) => ({
    key: `model-${k}`,
    label: `Model, ${v}`,
    filter: (e: Essay) => e.source === "llm" && e.condition === k,
  })),
];

export const GROUP_BY_KEY = Object.fromEntries(GROUPS.map((g) => [g.key, g]));

export const PROMPT_FILTERS = [
  { key: "both", label: "Both prompts" },
  { key: "Distance learning", label: "Distance learning" },
  { key: "Impact of technology", label: "Impact of technology" },
];

export function select(essays: Essay[], groupKey: string, prompt: string): Essay[] {
  const g = GROUP_BY_KEY[groupKey];
  return essays.filter((e) => g.filter(e) && (prompt === "both" || e.prompt === prompt));
}

export function essayDetail(e: Essay): string {
  if (e.source === "human") return `${e.prompt} · grade ${e.grade} · proficiency ${e.proficiency?.toFixed(1)} of 5`;
  return `${e.prompt} · ${CONDITION_LABEL[e.condition] ?? e.condition}`;
}

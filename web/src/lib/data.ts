import { useEffect, useState } from "react";
import type { Chunk, Markers, Profile } from "./text";
import { profile } from "./text";

export interface Essay {
  id: string;
  source: "human" | "llm";
  prompt: string;
  condition: string;
  grade?: number;
  proficiency?: number;
  band?: "lower" | "middle" | "higher";
  text: string;
}

export interface EssayData {
  prompts: Record<string, string>;
  sources: Record<string, string>;
  essays: Essay[];
}

export interface LiteraryData {
  vocab: string[];
  chunkSize: number;
  chunks: Chunk[];
}

export interface Lab4Data {
  passageSource: string;
  passage: string;
  modelSource: string;
  model: string;
}

const cache = new Map<string, Promise<unknown>>();

function load<T>(file: string, kind: "json" | "text" = "json"): Promise<T> {
  if (!cache.has(file)) {
    cache.set(
      file,
      fetch(`./data/${file}`).then((r) => {
        if (!r.ok) throw new Error(`Could not load ${file} (HTTP ${r.status})`);
        return kind === "json" ? r.json() : r.text();
      }),
    );
  }
  return cache.get(file) as Promise<T>;
}

export function useData<T>(file: string, kind: "json" | "text" = "json"): { data?: T; error?: string } {
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  useEffect(() => {
    let live = true;
    load<T>(file, kind)
      .then((data) => live && setState({ data }))
      .catch((e: Error) => live && setState({ error: e.message }));
    return () => {
      live = false;
    };
  }, [file, kind]);
  return state;
}

export interface Resources {
  essays: EssayData;
  wordlist: Set<string>;
  markers: Markers;
  profiles: Map<string, Profile>;
}

let resources: Promise<Resources> | null = null;

export function loadResources(): Promise<Resources> {
  if (!resources) {
    resources = Promise.all([
      load<EssayData>("essays.json"),
      load<string[]>("wordlist.json"),
      load<Markers>("markers.json"),
    ]).then(([essays, words, markers]) => {
      const wordlist = new Set(words);
      const profiles = new Map(essays.essays.map((e) => [e.id, profile(e.text, wordlist, markers)]));
      return { essays, wordlist, markers, profiles };
    });
  }
  return resources;
}

export function useResources(): { data?: Resources; error?: string } {
  const [state, setState] = useState<{ data?: Resources; error?: string }>({});
  useEffect(() => {
    let live = true;
    loadResources()
      .then((data) => live && setState({ data }))
      .catch((e: Error) => live && setState({ error: e.message }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

export type FeatureKey = Exclude<keyof Profile, "tokens" | "sentences">;

export interface FeatureInfo {
  key: FeatureKey;
  label: string;
  unit: string;
  digits: number;
  what: string;
  caution: string;
}

export const FEATURES: FeatureInfo[] = [
  {
    key: "meanWordLength",
    label: "Mean word length",
    unit: "letters",
    digits: 2,
    what: "Average number of letters per word.",
    caution: "Longer words often mean more academic vocabulary, but also follow topic and genre.",
  },
  {
    key: "mattr",
    label: "Lexical diversity (MATTR)",
    unit: "",
    digits: 3,
    what: "Share of different words in every 50-word window, averaged across the text. Unlike a plain type-token ratio, it is not distorted by text length.",
    caution: "Repetition can be a deliberate rhetorical choice, not a lack of vocabulary.",
  },
  {
    key: "offListPct",
    label: "Words beyond the 2,000 most common",
    unit: "%",
    digits: 1,
    what: "Percentage of words not on the 2,000 most frequent English words (wordfreq). A rough index of lexical sophistication.",
    caution: "Misspellings and words in other languages also fall outside the list. One learner essay here switches into Spanish part-way through, which explains its very high value.",
  },
  {
    key: "meanSentenceLength",
    label: "Mean sentence length",
    unit: "words",
    digits: 1,
    what: "Average words per sentence, splitting on . ! ? and line breaks.",
    caution: "Learner texts with missing punctuation produce very long 'sentences'; this is a property of the splitter as much as of the writer.",
  },
  {
    key: "sentenceLengthCV",
    label: "Sentence-length variation",
    unit: "",
    digits: 2,
    what: "Standard deviation of sentence length divided by its mean. Higher values mean a more uneven rhythm, sometimes called burstiness.",
    caution: "Easily changed by a single run-on sentence or a list.",
  },
  {
    key: "hedges",
    label: "Hedges",
    unit: "per 1,000 words",
    digits: 1,
    what: "Words that soften a claim: may, might, perhaps, I think, in my opinion. Adapted from Hyland (2005).",
    caution: "Counted without context: 'may' as a month or 'could' in a past-ability sense are miscounted.",
  },
  {
    key: "boosters",
    label: "Boosters",
    unit: "per 1,000 words",
    digits: 1,
    what: "Words that strengthen a claim: clearly, certainly, really, in fact, must.",
    caution: "Spoken-style intensifiers ('really') and formal boosters ('undoubtedly') count equally here.",
  },
  {
    key: "connectives",
    label: "Logical connectives",
    unit: "per 1,000 words",
    digits: 1,
    what: "Signposts that organise an argument: however, therefore, moreover, for example, in conclusion.",
    caution: "Explicitly taught in writing classes, so learners and models may both overuse them.",
  },
  {
    key: "selfMention",
    label: "Self-mention",
    unit: "per 1,000 words",
    digits: 1,
    what: "First-person pronouns: I, me, my, we, our, us.",
    caution: "Depends heavily on the task: personal-experience prompts invite far more of it.",
  },
];

export const FEATURE_BY_KEY = Object.fromEntries(FEATURES.map((f) => [f.key, f])) as Record<FeatureKey, FeatureInfo>;

export const CONDITION_LABEL: Record<string, string> = {
  default: "Default instruction",
  student: "“Write as a 10th-grade student”",
  concise: "“About 200 words”",
  persuade: "“Persuasive, strong thesis”",
};

export const BAND_LABEL: Record<string, string> = {
  lower: "Lower proficiency (below 3.0)",
  middle: "Middle proficiency (3.0 to 3.4)",
  higher: "Higher proficiency (3.5 and above)",
};

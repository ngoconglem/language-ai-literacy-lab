export interface GlossaryEntry {
  id: string;
  term: string;
  /** One or two plain sentences, no jargon. */
  plain: string;
  /** Longer explanation for the glossary page. */
  detail?: string;
  /** A practical rule of thumb for reading the number. */
  rule?: string;
  example?: string;
  topic: "Texts and words" | "Style measures" | "Comparing groups" | "Words in context" | "Authorship" | "Detection" | "Language models" | "Reading the charts";
}

export const GLOSSARY: GlossaryEntry[] = [
  // ---------------------------------------------------------------- texts and words
  {
    id: "corpus",
    term: "Corpus (plural: corpora)",
    plain: "A collection of texts gathered for analysis, such as 60 learner essays or one novel.",
    detail:
      "Results always describe the corpus you analysed, not language in general. Who wrote the texts, on what task and when all shape the numbers, so describe your corpus whenever you report a result.",
    topic: "Texts and words",
  },
  {
    id: "token",
    term: "Token (word count)",
    plain: "Each running word in a text. “The cat saw the dog” has five tokens.",
    detail:
      "This lab splits text into tokens at spaces and punctuation, keeps apostrophes inside words (don't, Austen's) and ignores numbers. Every “per 1,000 words” figure is calculated from the token count.",
    topic: "Texts and words",
  },
  {
    id: "type",
    term: "Type",
    plain: "Each different word form. “The cat saw the dog” has five tokens but four types, because “the” repeats.",
    topic: "Texts and words",
  },
  {
    id: "function-words",
    term: "Function words (stop words)",
    plain: "Small grammatical words such as the, of, and, to, it, which hold sentences together but carry little topic meaning.",
    detail:
      "They are the most frequent words in any English text. Frequency lists often hide them to show topic words, while authorship methods such as Burrows' Delta rely on them, because writers use them without conscious control.",
    topic: "Texts and words",
  },
  {
    id: "content-words",
    term: "Content words",
    plain: "Words that carry meaning about the topic: nouns, main verbs, adjectives and adverbs, such as technology, learn, online.",
    topic: "Texts and words",
  },
  {
    id: "per-1000",
    term: "Per 1,000 words (normalised frequency)",
    plain: "A count adjusted for text length, so a 200-word essay and a 900-word essay can be compared fairly.",
    detail: "Normalised frequency = (count ÷ number of words) × 1,000. Ten hedges in a 500-word essay is 20 per 1,000 words; ten in a 1,000-word essay is 10.",
    example: "6 uses of “however” in a 400-word essay = 6 ÷ 400 × 1,000 = 15 per 1,000 words.",
    topic: "Texts and words",
  },
  {
    id: "llm",
    term: "Large language model (LLM)",
    plain: "An AI system, such as ChatGPT or Claude, trained on very large amounts of text to predict likely next words. It produces fluent text but does not check it against the world.",
    topic: "Texts and words",
  },
  {
    id: "prompt",
    term: "Prompt",
    plain: "The instruction given to a language model. Small changes to a prompt (“write as a 10th-grader”) can change the style of the output a great deal.",
    topic: "Texts and words",
  },
  {
    id: "ellipse",
    term: "ELLIPSE corpus",
    plain: "A public collection of essays by English language learners in US grades 8–12, each scored by trained raters. The learner essays in this lab come from it.",
    detail:
      "Crossley, S. A., Tian, Y., Baffour, P., Franklin, A., Benner, M., & Boser, U. (2023). The English Language Learner Insight, Proficiency and Skills Evaluation (ELLIPSE) corpus. International Journal of Learner Corpus Research.",
    topic: "Texts and words",
  },
  {
    id: "proficiency",
    term: "Proficiency band",
    plain: "Learner essays grouped by their overall rater score (1–5): lower (below 3.0), middle (3.0–3.4) and higher (3.5 and above).",
    topic: "Texts and words",
  },
  {
    id: "close-distant",
    term: "Close reading and distant reading",
    plain: "Close reading looks carefully at particular passages. Distant reading counts and compares patterns across many texts. This lab moves between the two.",
    detail: "The term “distant reading” comes from the literary scholar Franco Moretti. Most good computational analysis goes back to close reading to check what a number actually means.",
    topic: "Texts and words",
  },

  // ---------------------------------------------------------------- style measures
  {
    id: "lexical-diversity",
    term: "Lexical diversity",
    plain: "How varied the vocabulary is. A text that keeps repeating the same words has low diversity.",
    topic: "Style measures",
  },
  {
    id: "ttr",
    term: "Type-token ratio (TTR)",
    plain: "Number of different words divided by total words. It falls as texts get longer, because common words repeat, so it is unfair for comparing texts of different lengths.",
    topic: "Style measures",
  },
  {
    id: "mattr",
    term: "MATTR (moving-average type-token ratio)",
    plain: "A measure of vocabulary variety that is fair across text lengths. It slides a 50-word window along the text, works out the share of different words in each window, and averages them.",
    rule: "Values run from 0 to 1; higher means more varied vocabulary. In this lab, learner essays mostly fall between .65 and .85 and model essays between .84 and .92.",
    detail: "Covington, M. A., & McFall, J. D. (2010). Cutting the Gordian knot: The moving-average type–token ratio (MATTR). Journal of Quantitative Linguistics, 17(2), 94–100.",
    topic: "Style measures",
  },
  {
    id: "off-list",
    term: "Words beyond the 2,000 most common",
    plain: "The percentage of words that are not among the 2,000 most frequent English words. A rough sign of less common, more sophisticated vocabulary.",
    rule: "In this lab, most learner essays sit between 5% and 15% and most model essays around 20%. Misspellings also count as off-list, so check the words themselves before concluding anything.",
    detail: "The 2,000-word boundary follows the usual definition of high-frequency vocabulary (Nation, 2001, Learning vocabulary in another language, Cambridge University Press). The word list comes from the wordfreq project (Speer, 2022), which combines frequencies from subtitles, Wikipedia, books, news and the web.",
    topic: "Style measures",
  },
  {
    id: "word-length",
    term: "Mean word length",
    plain: "The average number of letters per word. Longer averages often mean more formal or academic vocabulary.",
    topic: "Style measures",
  },
  {
    id: "sentence-length",
    term: "Mean sentence length",
    plain: "The average number of words per sentence. The lab ends a sentence at . ! ? or a line break, so missing punctuation produces very long “sentences”.",
    topic: "Style measures",
  },
  {
    id: "cv",
    term: "Sentence-length variation (coefficient of variation)",
    plain: "How uneven sentence lengths are. It is the standard deviation of sentence length divided by the average, so short and long texts can be compared.",
    rule: "Higher values mean a bigger mix of short and long sentences. There is no standard cut-off; in this lab, model essays range from about 0.3 to 0.5 and learner essays spread much more widely.",
    topic: "Style measures",
  },
  {
    id: "burstiness",
    term: "Burstiness",
    plain: "A popular name for uneven rhythm: human writing is said to mix short and long sentences more than AI writing does. It is a tendency, not a rule.",
    topic: "Style measures",
  },
  {
    id: "stance",
    term: "Stance markers",
    plain: "Words writers use to show how sure they are and where they stand, such as hedges, boosters and self-mention.",
    detail: "The categories follow Hyland, K. (2005). Stance and engagement: A model of interaction in academic discourse. Discourse Studies, 7(2), 173–192.",
    topic: "Style measures",
  },
  {
    id: "hedge",
    term: "Hedges",
    plain: "Words that soften a claim or show caution: may, might, perhaps, possibly, I think, in my opinion.",
    rule: "Academic writers hedge often; very few hedges can make writing sound overconfident.",
    topic: "Style measures",
  },
  {
    id: "booster",
    term: "Boosters",
    plain: "Words that strengthen a claim or show certainty: clearly, certainly, really, in fact, must, definitely.",
    topic: "Style measures",
  },
  {
    id: "connective",
    term: "Logical connectives",
    plain: "Signpost words that link ideas and organise an argument: however, therefore, moreover, for example, in conclusion.",
    topic: "Style measures",
  },
  {
    id: "self-mention",
    term: "Self-mention",
    plain: "First-person pronouns (I, me, my, we, our, us), which show the writer's presence in the text.",
    topic: "Style measures",
  },
  {
    id: "sd",
    term: "Standard deviation (SD)",
    plain: "How spread out values are around their average. A small SD means most values are close to the average; a large SD means they vary a lot.",
    topic: "Style measures",
  },
  {
    id: "z-score",
    term: "z-score",
    plain: "How far a value is from the average, measured in standard deviations. 0 is exactly average; +1 is one SD above; −2 is two SDs below.",
    detail: "z = (value − average) ÷ standard deviation. Converting different measures to z-scores puts them on the same scale so they can be added or averaged.",
    topic: "Style measures",
  },

  // ---------------------------------------------------------------- comparing groups
  {
    id: "keyness",
    term: "Keyness",
    plain: "A way of finding the words that are unusually frequent in one group of texts compared with another. The “key words” sketch what is typical of each group.",
    detail: "Keyness is always relative: a word is key only against the comparison corpus you chose. Change the comparison and the key words change.",
    topic: "Comparing groups",
  },
  {
    id: "reference-corpus",
    term: "Reference corpus",
    plain: "The collection you compare against. In this lab the two groups act as each other's reference.",
    topic: "Comparing groups",
  },
  {
    id: "log-likelihood",
    term: "Log-likelihood (LL)",
    plain: "A test of whether a word's difference in frequency between two groups is bigger than you would expect by chance. Bigger values mean stronger evidence of a real difference.",
    rule: "LL above 3.84 corresponds to p < .05, above 6.63 to p < .01 and above 10.83 to p < .001. This lab lists only words above 6.63.",
    detail: "Rayson, P., & Garside, R. (2000). Comparing corpora using frequency profiling. LL tells you how sure you can be that a difference exists, not how large it is; use log ratio for size.",
    topic: "Comparing groups",
  },
  {
    id: "p-value",
    term: "p-value and statistical significance",
    plain: "Roughly, how surprising a result would be if there were really no difference. p < .01 means a difference this large would arise by chance less than 1 time in 100.",
    detail: "A small p-value does not mean a difference is large or important; with lots of text, tiny differences become “significant”.",
    topic: "Comparing groups",
  },
  {
    id: "log-ratio",
    term: "Log ratio",
    plain: "How much more frequent a word is in one group than the other, on a doubling scale. +1 means twice as frequent in the first group, +2 four times, −1 twice as frequent in the second group, 0 equally frequent.",
    rule: "Read it as “2 to the power of the log ratio”: +3 means about 8 times as frequent.",
    detail: "Hardie, A. (2014). Log Ratio: An informal introduction. ESRC Centre for Corpus Approaches to Social Science (CASS). Frequencies are compared per word, so group size does not matter.",
    topic: "Comparing groups",
  },
  {
    id: "effect-size",
    term: "Effect size (how much groups overlap)",
    plain: "How big a difference between two groups is, compared with how much texts vary within each group. A small effect means the groups overlap heavily even if their averages differ.",
    rule: "Cohen (1988): d of 0.2 is small, 0.5 medium and 0.8 large. Sawilowsky (2009) added 1.2 very large and 2.0 huge.",
    detail:
      "The Compare page uses Cohen's d: the difference between the group averages divided by the pooled standard deviation. Even a large difference (d = 0.8) leaves the two groups overlapping a great deal; only at d = 2.0 do they overlap little. Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Erlbaum. Sawilowsky, S. S. (2009). New effect size rules of thumb. Journal of Modern Applied Statistical Methods, 8(2), 597–599.",
    topic: "Comparing groups",
  },

  // ---------------------------------------------------------------- words in context
  {
    id: "concordance",
    term: "Concordance (KWIC)",
    plain: "A list of every place a word appears, each shown in the middle of a line with the words before and after it. KWIC stands for “key word in context”.",
    rule: "Read many lines, not just the first few, before drawing a conclusion, and sort by the word after (or before) to make patterns easy to spot.",
    topic: "Words in context",
  },
  {
    id: "node",
    term: "Node word",
    plain: "The word you are searching for in a concordance or collocation analysis.",
    topic: "Words in context",
  },
  {
    id: "collocation",
    term: "Collocation and collocates",
    plain: "Words that habitually appear near each other, such as “strong coffee” or “make a decision”. The words found near your node word are its collocates.",
    topic: "Words in context",
  },
  {
    id: "window",
    term: "Window (span)",
    plain: "How many words either side of the node word count as “near” it. A window of 4 looks four words left and four words right.",
    topic: "Words in context",
  },
  {
    id: "logdice",
    term: "logDice",
    plain: "A score for how strongly two words are attached to each other. It rewards collocates that appear mostly near the node word and is not distorted by corpus size.",
    rule: "The maximum is 14. There is no agreed cut-off, so compare collocates within the same list. Because the score is on a base-2 log scale, one point higher means roughly twice the association.",
    detail: "Rychlý, P. (2008). A lexicographer-friendly association score. Proceedings of Recent Advances in Slavonic Natural Language Processing, 6–9.",
    topic: "Words in context",
  },
  {
    id: "mi",
    term: "Mutual information (MI)",
    plain: "Another attachment score. It compares how often two words occur together with how often they would by chance. It tends to favour rare words that happen to co-occur once or twice.",
    rule: "MI of 3 or more is a widely used threshold for a meaningful collocation (Hunston, 2002).",
    detail: "Hunston, S. (2002). Corpora in applied linguistics. Cambridge University Press.",
    topic: "Words in context",
  },
  {
    id: "overlap",
    term: "Content-word overlap",
    plain: "The share of a sentence's content words that also appear in the source text. High overlap suggests the sentence stays close to the source wording; it does not prove the sentence is accurate.",
    topic: "Words in context",
  },

  // ---------------------------------------------------------------- authorship
  {
    id: "stylometry",
    term: "Stylometry",
    plain: "Measuring writing style with numbers, usually to compare authors or attribute a text of unknown authorship.",
    topic: "Authorship",
  },
  {
    id: "delta",
    term: "Burrows' Delta",
    plain: "A measure of how different two texts are in style, based on how often they use the most frequent words. Lower Delta means more similar; texts by the same author usually have the lowest Delta.",
    detail:
      "For each of the most frequent words, the lab turns its frequency in each passage into a z-score, then averages the absolute differences between two passages. Burrows, J. (2002). ‘Delta’: A measure of stylistic difference and a guide to likely authorship. Literary and Linguistic Computing, 17(3), 267–287.",
    rule: "In this lab, passages by the same author average a Delta of about 0.85 and passages by different authors about 1.2. Compare values within one analysis rather than against a fixed cut-off.",
    topic: "Authorship",
  },
  {
    id: "mfw",
    term: "Most frequent words (MFW)",
    plain: "The words used most often across all passages, mostly function words. Delta compares texts on the top 20, 100 or 300 of these.",
    topic: "Authorship",
  },
  {
    id: "nearest-neighbour",
    term: "Nearest neighbour",
    plain: "The passage with the lowest Delta to the passage you chose, that is, the most similar in style. If it is by the same author, the attribution is counted as correct.",
    topic: "Authorship",
  },

  // ---------------------------------------------------------------- detection
  {
    id: "detector",
    term: "AI-writing detector",
    plain: "Software that guesses whether text was written by a person or generated by AI. It gives a score, and texts above a chosen cut-off are flagged.",
    topic: "Detection",
  },
  {
    id: "threshold",
    term: "Threshold (cut-off)",
    plain: "The score above which a detector flags a text. Lowering it catches more AI text but also flags more real students; raising it does the reverse.",
    topic: "Detection",
  },
  {
    id: "false-positive",
    term: "False positive",
    plain: "A wrong accusation: a text written by a person that the detector flags as AI-written.",
    topic: "Detection",
  },
  {
    id: "false-negative",
    term: "False negative (miss)",
    plain: "An AI-generated text that the detector does not flag.",
    topic: "Detection",
  },
  {
    id: "accuracy",
    term: "Accuracy",
    plain: "The share of all texts the detector classifies correctly. High accuracy can hide many wrong accusations if one group is much larger than the other.",
    topic: "Detection",
  },

  // ---------------------------------------------------------------- language models
  {
    id: "llm-token",
    term: "Token (in a language model)",
    plain: "The unit a language model reads and writes: a common word, part of a word, a single character or even part of a character, taken from a fixed vocabulary. Not the same as a token in corpus linguistics, which is a whole running word.",
    example: "GPT-4o splits “unbelievable” into a few pieces, but treats “ the” (with its space) as a single token.",
    topic: "Language models",
  },
  {
    id: "tokeniser",
    term: "Tokeniser",
    plain: "The program that cuts text into a model's tokens before the model sees it. Each model family has its own tokeniser and vocabulary, learned from its training text.",
    detail: "OpenAI's tokenisers use byte-pair encoding: start from the bytes of the text and repeatedly merge the most frequent neighbouring pairs into larger units. Languages that were rare in the training text get fewer merged units, so their text is cut into more, smaller pieces.",
    topic: "Language models",
  },
  {
    id: "token-premium",
    term: "Token premium",
    plain: "How many times more tokens a language needs than English to express the same content. 1.0 means the same as English; 2.0 means twice as many.",
    rule: "A premium of 2.0 doubles the cost of the same request on a service that charges per token, and halves how much text fits in the model's context window.",
    detail: "Petrov, A., La Malfa, E., Torr, P., & Bibi, A. (2023). Language model tokenizers introduce unfairness between languages. Advances in Neural Information Processing Systems, 36. Ahia, O., et al. (2023). Do all languages cost the same? Tokenization in the era of commercial language models. Proceedings of EMNLP 2023, 9904–9923.",
    topic: "Language models",
  },
  {
    id: "context-window",
    term: "Context window",
    plain: "The maximum number of tokens a model can take in at once, including your instructions, any documents you paste, and its reply. Text that does not fit is cut off or must be split.",
    topic: "Language models",
  },
  {
    id: "parallel-corpus",
    term: "Parallel corpus",
    plain: "The same texts in two or more languages, aligned so that equivalent passages can be compared. Translations of the Universal Declaration of Human Rights are a classic example.",
    topic: "Language models",
  },

  // ---------------------------------------------------------------- reading the charts
  {
    id: "strip-plot",
    term: "Strip plot (dot plot)",
    plain: "A chart with one dot per text along a line. It shows the whole spread of values, not just the average, so you can see overlap and unusual texts.",
    topic: "Reading the charts",
  },
  {
    id: "group-average",
    term: "Group average (mean)",
    plain: "The sum of the values divided by the number of texts. On the charts it is shown as a short dark tick across each group's row of dots.",
    topic: "Reading the charts",
  },
  {
    id: "outlier",
    term: "Outlier",
    plain: "A text whose value is far from the rest of its group. Always read outliers: they are often the most interesting texts, or reveal a quirk of the measure.",
    topic: "Reading the charts",
  },
  {
    id: "heatmap",
    term: "Heatmap (distance matrix)",
    plain: "A grid that compares every passage with every other passage. Each square's shade shows how similar the two are; darker means more similar.",
    topic: "Reading the charts",
  },
];

export const GLOSSARY_BY_ID: Record<string, GlossaryEntry> = Object.fromEntries(GLOSSARY.map((g) => [g.id, g]));

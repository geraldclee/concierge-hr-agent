import { DurableObject } from "cloudflare:workers";

// ---------------------------------------------------------------------------
// Text matching helpers
// Keyword search with: stop-word removal, light stemming, HR synonyms,
// rarity weighting (rare words count more), and section-heading context.
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "yours", "all", "any", "can",
  "had", "has", "have", "her", "his", "him", "how", "its", "may", "our", "out", "who",
  "why", "what", "when", "where", "which", "will", "with", "would", "should", "could",
  "this", "that", "these", "those", "there", "their", "they", "them", "then", "than",
  "from", "into", "onto", "about", "does", "did", "doing", "was", "were", "been", "being",
  "get", "got", "per", "each", "also", "only", "just", "some", "such", "much", "many",
  "more", "most", "very", "own", "other", "able", "need", "needs", "want", "wants",
  "please", "tell", "know", "let", "under", "over", "after", "before", "during", "while",
  "employee", "employees", "employer", "staff", "company", "policy",
  "is", "am", "an", "as", "at", "be", "by", "do", "he", "if", "in", "it", "me", "my",
  "no", "of", "on", "or", "so", "to", "up", "us", "we", "i", "a",
]);

// Groups of words that mean the same thing in HR questions.
const SYNONYM_GROUPS = [
  ["sick", "ill", "illness", "medical", "unwell", "mc", "accident", "hospital"],
  ["apply", "request", "submit", "book", "ask", "application"],
  ["leave", "vacation", "holiday", "pto"],
  ["carry", "forward", "rollover", "roll", "unused", "remaining", "balance"],
  ["parttime", "part", "pro", "rated", "prorated"],
  ["day", "days", "entitlement", "entitled", "allowance", "many"],
  ["manager", "lead", "supervisor", "approval", "approve", "approved"],
  ["salary", "pay", "paid", "payroll", "wage"],
  ["claim", "reimburse", "reimbursement", "expense", "expenses", "receipt"],
  ["resign", "resignation", "quit", "termination", "notice", "end", "ends"],
  ["join", "joiner", "new", "start", "onboarding"],
  ["deadline", "expire", "expiry", "latest", "march"],
  ["certificate", "mc", "proof", "document"],
  ["system", "hris", "portal", "workday", "app"],
];

// Irregular forms the simple rules below don't handle.
const IRREGULAR = { approval: "approv", leaving: "leav", left: "leav" };

function stem(word) {
  if (IRREGULAR[word]) return IRREGULAR[word];
  let w = word;
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && (w.endsWith("ied") || w.endsWith("ies"))) w = w.slice(0, -3) + "y";
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && /(ss|x|z|ch|sh)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  // Drop a trailing "e" so approve / approves / approved all become "approv".
  if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

const SYNONYM_INDEX = new Map();
SYNONYM_GROUPS.forEach((group, i) => {
  for (const word of group) SYNONYM_INDEX.set(stem(word), i);
});

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/part[\s-]time/g, "parttime")
    .replace(/pro[\s-]rat/g, "prorat")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem);
}

// A token is represented by its synonym group ("g3") if it has one, so that
// "sick" and "illness" count as the same concept.
function concept(token) {
  return SYNONYM_INDEX.has(token) ? "g" + SYNONYM_INDEX.get(token) : token;
}

function conceptSet(text) {
  const set = new Set();
  for (const t of tokenize(text)) {
    set.add(t);
    set.add(concept(t));
  }
  return set;
}

function queryConcepts(text) {
  // Unique query terms, each matched either exactly or via its synonym group.
  const seen = new Map();
  for (const t of tokenize(text)) {
    if (!seen.has(t)) seen.set(t, { token: t, concept: concept(t) });
  }
  return [...seen.values()];
}

function countConcepts(text) {
  const counts = new Map();
  for (const t of tokenize(text)) {
    counts.set(t, (counts.get(t) || 0) + 1);
    const c = concept(t);
    if (c !== t) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return counts;
}

// Score candidates with BM25-style weighting: rare words count more, repeated
// words help a little, and long paragraphs don't win just by being long.
// The score is roughly "share of the question covered" (about 0 to 1.2).
function rankCandidates(question, candidates) {
  const terms = queryConcepts(question);
  if (terms.length === 0) return { terms, ranked: [] };

  const k1 = 1.2;
  const b = 0.6;
  const counts = candidates.map((c) => countConcepts(c.searchText));
  const lengths = candidates.map((c) => tokenize(c.searchText).length || 1);
  const avgLen = lengths.reduce((a, x) => a + x, 0) / (lengths.length || 1) || 1;
  const n = counts.length;

  const weights = terms.map((term) => {
    let df = 0;
    for (const m of counts) if (m.has(term.token) || m.has(term.concept)) df++;
    const w = Math.log(1 + (n + 1) / (df + 0.5)); // rarer words weigh more
    // Words that appear nowhere in the documents (e.g. "July") count half,
    // so one unknown word doesn't sink an otherwise good match.
    return df === 0 ? w * 0.8 : w;
  });
  const totalWeight = weights.reduce((a, x) => a + x, 0) || 1;

  const ranked = candidates
    .map((c, i) => {
      const K = k1 * (1 - b + (b * lengths[i]) / avgLen);
      let score = 0;
      let hits = 0;
      terms.forEach((term, j) => {
        const exact = counts[i].get(term.token) || 0;
        const syn = counts[i].get(term.concept) || 0;
        const tf = Math.max(exact, syn);
        if (tf === 0) return;
        const factor = exact > 0 ? 1 : 0.8; // synonym match counts slightly less
        const tfPart = Math.min((tf * (k1 + 1)) / (tf + K), 1.3);
        score += weights[j] * factor * tfPart;
        hits++;
      });
      // Very short fragments (e.g. headings) are weaker answers.
      const lengthPenalty = c.answerText.length < 40 ? 0.6 : 1;
      return { ...c, score: (score / totalWeight) * lengthPenalty, hits };
    })
    .filter((c) => c.hits > 0)
    .sort((a, b2) => b2.score - a.score);

  return { terms, ranked };
}

// Split a document into paragraphs/bullets. Short heading lines are attached
// to the paragraphs that follow them, so "Carry forward of annual leave" gives
// context to each bullet in that section.
function splitIntoChunks(text) {
  const blocks = String(text || "")
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  const chunks = [];
  let heading = "";
  for (const block of blocks) {
    const isBullet = /^[•·▪●◦\-–*]|^\d+[.)]\s/.test(block);
    const looksLikeHeading =
      !isBullet && block.length < 70 && !/[.;:,]$/.test(block) && block.split(" ").length <= 9;
    if (looksLikeHeading) {
      heading = block;
      continue;
    }
    if (block.length < 20) continue;
    const body = block.replace(/^[•·▪●◦\-–*]\s*/, "");
    chunks.push({
      heading,
      answerText: body,
      searchText: heading + " " + body,
    });
  }
  return chunks;
}

export class Gadget extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
  }

  async getQuestions(location) {
    const stored = await this.ctx.storage.get(`qa:${location.toLowerCase()}`);
    return stored || [];
  }

  async getDocuments(location) {
    const stored = await this.ctx.storage.get(`docs:${location.toLowerCase()}`);
    return stored || [];
  }

  async addQuestion(location, question, answer) {
    const loc = location.toLowerCase();
    const list = (await this.ctx.storage.get(`qa:${loc}`)) || [];
    list.push({ question: question.trim(), answer: answer.trim(), added: Date.now() });
    await this.ctx.storage.put(`qa:${loc}`, list);
    return list;
  }

  async uploadBatch(location, pairs) {
    const loc = location.toLowerCase();
    const list = (await this.ctx.storage.get(`qa:${loc}`)) || [];
    const now = Date.now();
    for (const p of pairs) {
      list.push({
        question: String(p.question || "").trim(),
        answer: String(p.answer || "").trim(),
        added: now,
      });
    }
    await this.ctx.storage.put(`qa:${loc}`, list);
    return list;
  }

  async uploadDocument(location, title, content) {
    const loc = location.toLowerCase();
    const docs = (await this.ctx.storage.get(`docs:${loc}`)) || [];
    docs.push({
      title: String(title || "Uploaded document").trim(),
      content: String(content || "").trim(),
      added: Date.now(),
    });
    await this.ctx.storage.put(`docs:${loc}`, docs);
    return docs;
  }

  async clearLocation(location) {
    const loc = location.toLowerCase();
    await this.ctx.storage.delete(`qa:${loc}`);
    await this.ctx.storage.delete(`docs:${loc}`);
    return [];
  }

  async findAnswer(email, location, userQuestion) {
    const loc = location.toLowerCase();
    const list = (await this.ctx.storage.get(`qa:${loc}`)) || [];
    const docs = (await this.ctx.storage.get(`docs:${loc}`)) || [];

    if (list.length === 0 && docs.length === 0) {
      return {
        found: false,
        text: "No HR documents have been uploaded for " + location + " yet. Please contact HR for help.",
      };
    }

    if (queryConcepts(userQuestion).length === 0) {
      return {
        found: false,
        text: "Please enter a more detailed question so I can search our HR documents.",
      };
    }

    // First: explicit Q&A pairs (matched on the question wording).
    if (list.length > 0) {
      const qaCandidates = list.map((item) => ({
        item,
        searchText: item.question,
        answerText: item.answer,
      }));
      const { ranked } = rankCandidates(userQuestion, qaCandidates);
      const best = ranked[0];
      if (best && best.score >= 0.45) {
        return {
          found: true,
          text: best.item.answer,
          matchedQuestion: best.item.question,
          source: "exact Q&A",
        };
      }
    }

    // Second: search the paragraphs/bullets of the uploaded document(s).
    const docCandidates = [];
    for (const doc of docs) {
      for (const chunk of splitIntoChunks(doc.content)) {
        docCandidates.push({ ...chunk, docTitle: doc.title });
      }
    }

    const { ranked } = rankCandidates(userQuestion, docCandidates);
    const best = ranked[0];
    if (best && best.score >= 0.3) {
      const parts = [];
      if (best.heading) parts.push(best.heading + ":");
      parts.push(best.answerText);

      // If the runner-up is from the same section and nearly as relevant, include it too.
      const second = ranked[1];
      if (
        second &&
        second.heading === best.heading &&
        second.score >= best.score * 0.85 &&
        second.answerText !== best.answerText
      ) {
        parts.push("\n" + second.answerText);
      }

      return {
        found: true,
        text: parts.join("\n"),
        source: "uploaded HR document" + (best.docTitle ? " (" + best.docTitle + ")" : ""),
      };
    }

    return {
      found: false,
      text:
        "I couldn't find an answer to that question in our " +
        location +
        " HR documents. Please rephrase your question or contact HR directly.",
    };
  }
}

import { DurableObject } from "cloudflare:workers";

// Simple keyword scoring helper. We tokenize to lowercase words and score by overlap.
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreOverlap(queryTokens, candidateText) {
  const qTokens = tokenize(candidateText);
  if (qTokens.length === 0 || queryTokens.length === 0) return 0;
  let hits = 0;
  for (const t of queryTokens) {
    if (qTokens.includes(t)) hits++;
  }
  return hits / queryTokens.length;
}

// Split a long document into meaningful chunks/paragraphs.
function splitIntoChunks(text) {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 20);
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

    const queryTokens = tokenize(userQuestion);
    if (queryTokens.length === 0) {
      return {
        found: false,
        text: "Please enter a more detailed question so I can search our HR documents.",
      };
    }

    // First: try to find an explicit Q&A pair that matches the question.
    let best = null;
    let bestScore = 0;
    for (const item of list) {
      const s = scoreOverlap(queryTokens, item.question);
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    }

    const qaThreshold = 0.15;
    if (best && bestScore >= qaThreshold) {
      return {
        found: true,
        text: best.answer,
        matchedQuestion: best.question,
        source: "exact Q&A",
      };
    }

    // Second: search the full uploaded document(s) for the most relevant paragraph.
    let bestChunk = null;
    let bestChunkScore = 0;
    for (const doc of docs) {
      const chunks = splitIntoChunks(doc.content);
      for (const chunk of chunks) {
        const s = scoreOverlap(queryTokens, chunk);
        if (s > bestChunkScore) {
          bestChunkScore = s;
          bestChunk = chunk;
        }
      }
    }

    const docThreshold = 0.1;
    if (bestChunk && bestChunkScore >= docThreshold) {
      return {
        found: true,
        text: bestChunk,
        source: "uploaded HR document",
      };
    }

    return {
      found: false,
      text: "I couldn't find an answer to that question in our " + location + " HR documents. Please rephrase your question or contact HR directly.",
    };
  }
}

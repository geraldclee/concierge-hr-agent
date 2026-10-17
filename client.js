const LOCATIONS = ["Singapore", "Switzerland"];
const ADMIN_PASSWORD = "hradmin";

const style = document.createElement("style");
style.textContent = `
  :root {
    --bg: #f6f8fa;
    --card: #ffffff;
    --text: #1f2937;
    --muted: #6b7280;
    --primary: #2563eb;
    --primary-dark: #1d4ed8;
    --success: #10b981;
    --danger: #ef4444;
    --border: #e5e7eb;
    --radius: 12px;
    --shadow: 0 4px 20px rgba(0,0,0,0.08);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  #app {
    width: 100%;
    max-width: 760px;
    padding: 24px;
  }
  header {
    text-align: center;
    margin-bottom: 24px;
  }
  h1 { margin: 0 0 6px; font-size: 1.7rem; }
  header p { margin: 0; color: var(--muted); }
  nav.tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    background: var(--card);
    padding: 6px;
    border-radius: 999px;
    box-shadow: var(--shadow);
  }
  nav.tabs button {
    flex: 1;
    padding: 12px 16px;
    border: none;
    background: transparent;
    border-radius: 999px;
    color: var(--muted);
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  nav.tabs button.active {
    background: var(--primary);
    color: #fff;
  }
  .card {
    background: var(--card);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 24px;
    margin-bottom: 20px;
  }
  label {
    display: block;
    font-weight: 600;
    margin: 16px 0 6px;
    color: var(--text);
  }
  label:first-child { margin-top: 0; }
  input, select, textarea, button[type="submit"] {
    width: 100%;
    font: inherit;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    color: var(--text);
  }
  input:focus, select:focus, textarea:focus {
    outline: 2px solid var(--primary);
    border-color: var(--primary);
  }
  textarea { min-height: 110px; resize: vertical; }
  button[type="submit"], .btn {
    width: 100%;
    margin-top: 18px;
    background: var(--primary);
    color: #fff;
    border: none;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, transform 0.05s;
  }
  button[type="submit"]:hover, .btn:hover { background: var(--primary-dark); }
  button[type="submit"]:active, .btn:active { transform: translateY(1px); }
  .btn-secondary {
    background: #fff;
    color: var(--primary);
    border: 1px solid var(--primary);
  }
  .btn-danger { background: var(--danger); }
  .btn-danger:hover { background: #dc2626; }
  .answer-card {
    border-left: 5px solid var(--success);
    padding: 16px;
    background: #f0fdf4;
    border-radius: 8px;
    margin-top: 20px;
    white-space: pre-wrap;
  }
  .answer-card.not-found {
    border-left-color: var(--danger);
    background: #fef2f2;
  }
  .answer-card h3 { margin: 0 0 8px; font-size: 1rem; color: #065f46; }
  .answer-card.not-found h3 { color: var(--danger); }
  .subtext { color: var(--muted); font-size: 0.9rem; margin-top: 8px; }
  .message { padding: 12px; border-radius: 8px; margin-bottom: 16px; }
  .message.error { background: #fef2f2; color: #991b1b; }
  .message.success { background: #f0fdf4; color: #065f46; }
  .hidden { display: none !important; }
  .two-cols { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
  @media (max-width: 560px) {
    .two-cols { grid-template-columns: 1fr; }
    h1 { font-size: 1.4rem; }
    #app { padding: 16px; }
  }
  .qa-list { list-style: none; padding: 0; margin: 0; }
  .qa-list li {
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 12px;
  }
  .qa-list strong { display: block; margin-bottom: 4px; color: var(--primary); }
  .qa-list span { color: var(--muted); font-size: 0.9rem; }
  .lockout {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .hint { font-size: 0.85rem; color: var(--muted); background: #f9fafb; padding: 12px; border-radius: 8px; }
  .hint code { background: #e5e7eb; padding: 1px 4px; border-radius: 4px; }
`;
document.head.appendChild(style);

const app = document.createElement("div");
app.id = "app";
document.body.appendChild(app);

let currentTab = "ask";
let adminUnlocked = false;

function renderHeader() {
  return `
    <header>
      <h1>💼 HR Assistant</h1>
      <p>Ask routine HR questions based on your location</p>
    </header>
  `;
}

function renderTabs() {
  return `
    <nav class="tabs">
      <button class="${currentTab === "ask" ? "active" : ""}" data-tab="ask">Ask a Question</button>
      <button class="${currentTab === "admin" ? "active" : ""}" data-tab="admin">HR Admin</button>
    </nav>
  `;
}

function renderAskView() {
  return `
    <div class="card">
      <form id="ask-form">
        <label for="email">Work Email</label>
        <input id="email" type="email" required placeholder="e.g. employee@company.com" />

        <label for="location">Location</label>
        <select id="location" required>
          <option value="" disabled selected>Select your location</option>
          ${LOCATIONS.map((l) => `<option value="${l}">${l}</option>`).join("")}
        </select>

        <label for="question">Your Question</label>
        <textarea id="question" required placeholder="e.g. How many days of annual leave do I get?"></textarea>

        <button type="submit">Find Answer</button>
        <p class="subtext">Answers are sourced only from uploaded HR documents.</p>
      </form>
      <div id="answer-area"></div>
    </div>
  `;
}

function renderAdminLock() {
  return `
    <div class="card lockout">
      <p>This area is for HR administrators only.</p>
      <input id="admin-pass" type="password" placeholder="Enter admin password" />
      <button class="btn" id="admin-unlock">Unlock</button>
      <p class="subtext">Default password: <code>hradmin</code></p>
    </div>
  `;
}

function renderAdminView() {
  return `
    <div class="card">
      <p class="hint">
        Upload HR documents. Supported formats: <code>.txt</code>, <code>.json</code>, or text-based <code>.pdf</code>.<br>
        Two ways to upload:<br>
        1. <strong>Full policy document</strong> — just upload any HR document. The agent will find the most relevant paragraph when employees ask questions.<br>
        2. <strong>Q&A list</strong> — format the document with <code>Q:</code> and <code>A:</code> markers for faster, exact answers.<br>
        <code>Q: What is the leave policy?</code><br>
        <code>A: Employees receive 14 days per year.</code>
      </p>

      <form id="upload-form">
        <label for="admin-location">Document Location</label>
        <select id="admin-location" required>
          <option value="" disabled selected>Select location</option>
          ${LOCATIONS.map((l) => `<option value="${l}">${l}</option>`).join("")}
        </select>

        <label for="doc-text">Document Text (or paste Q&A text here)</label>
        <textarea id="doc-text" placeholder="Q: ...\nA: ..."></textarea>

        <label>Or upload a file (.txt / .json / .pdf)</label>
        <input id="doc-file" type="file" accept=".txt,.json,.pdf,text/plain,application/json,application/pdf" />

        <button type="submit">Upload / Add Q&A</button>
        <p class="subtext">Duplicate uploads may result in duplicate entries.</p>
      </form>
      <div id="upload-message"></div>
    </div>

    <div class="card">
      <div class="two-cols" style="align-items: center; margin-bottom: 16px;">
        <h2 style="margin:0">Current Q&A</h2>
        <select id="view-location">
          ${LOCATIONS.map((l) => `<option value="${l}">${l}</option>`).join("")}
        </select>
      </div>
      <ul class="qa-list" id="qa-list"></ul>
      <button class="btn btn-danger" id="clear-location">Clear selected location</button>
    </div>
  `;
}

function render() {
  app.innerHTML = renderHeader() + renderTabs();
  if (currentTab === "ask") {
    app.innerHTML += renderAskView();
    bindAskForm();
  } else if (!adminUnlocked) {
    app.innerHTML += renderAdminLock();
    bindAdminLock();
  } else {
    app.innerHTML += renderAdminView();
    bindAdminForm();
    refreshQAList();
  }

  app.querySelectorAll("nav.tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTab = btn.dataset.tab;
      render();
    });
  });
}

function bindAskForm() {
  const form = document.getElementById("ask-form");
  const answerArea = document.getElementById("answer-area");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    answerArea.innerHTML = "<p class=\"subtext\">Searching HR documents…</p>";
    const email = document.getElementById("email").value.trim();
    const location = document.getElementById("location").value;
    const question = document.getElementById("question").value.trim();
    try {
      const result = await gadget.findAnswer(email, location, question);
      const cls = result.found ? "answer-card" : "answer-card not-found";
      answerArea.innerHTML = `
        <div class="${cls}">
          <h3>${result.found ? "Answer" : "No matching answer found"}</h3>
          <div>${escapeHtml(result.text)}</div>
          ${result.matchedQuestion ? `<p class="subtext">Matched question: ${escapeHtml(result.matchedQuestion)}</p>` : ""}
        </div>
      `;
    } catch (err) {
      answerArea.innerHTML = `<div class="message error">Error: ${escapeHtml(err.message)}</div>`;
    }
  });
}

function bindAdminLock() {
  document.getElementById("admin-unlock").addEventListener("click", () => {
    const pass = document.getElementById("admin-pass").value;
    if (pass === ADMIN_PASSWORD) {
      adminUnlocked = true;
      render();
    } else {
      alertPassword("Incorrect password.");
    }
  });
}

function alertPassword(message) {
  const existing = document.querySelector(".lockout .message");
  if (existing) existing.remove();
  const div = document.createElement("div");
  div.className = "message error";
  div.textContent = message;
  document.querySelector(".lockout").prepend(div);
}

function parseQA(content) {
  content = content.trim();
  if (!content) return [];
  // Try JSON first
  if (content.startsWith("[") || content.startsWith("{")) {
    try {
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr
        .map((item) => ({ question: item.question, answer: item.answer }))
        .filter((p) => p.question && p.answer);
    } catch {
      // fall through to text parsing
    }
  }

  // Normalize inline Q: / A: markers (common when text is extracted from PDFs
  // or Word documents) so each marker starts its own line.
  content = content
    .replace(/(^|\s)(Q:\s*)/gi, "$1\n$2")
    .replace(/(^|\s)(A:\s*)/gi, "$1\n$2")
    .trim();

  // Text parsing: split by blank lines, each block may contain Q: and A: lines.
  const lines = content.split(/\r?\n/);
  const pairs = [];
  let currentQ = "";
  let currentA = "";
  let started = false;

  function flush() {
    if (currentQ && currentA) {
      pairs.push({ question: currentQ.trim(), answer: currentA.trim() });
    }
    currentQ = "";
    currentA = "";
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (started) flush();
      continue;
    }
    started = true;
    const qMatch = line.match(/^Q[:：\-]?\s*(.*)$/i);
    const aMatch = line.match(/^A[:：\-]?\s*(.*)$/i);
    if (qMatch) {
      // A new question starts; save any previous pair.
      flush();
      currentQ = qMatch[1];
    } else if (aMatch) {
      currentA = aMatch[1];
    } else {
      // Continuation of the current field.
      if (currentA) {
        currentA += " " + line;
      } else if (currentQ) {
        currentQ += " " + line;
      }
    }
  }
  flush();
  return pairs;
}

function bindAdminForm() {
  const form = document.getElementById("upload-form");
  const msg = document.getElementById("upload-message");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.innerHTML = "<p class=\"subtext\">Reading file…</p>";
    const location = document.getElementById("admin-location").value;
    const textInput = document.getElementById("doc-text").value;
    const fileInput = document.getElementById("doc-file");

    let content = textInput.trim();
    let fileType = "text";
    let fileName = "Pasted text";
    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

    if (file) {
      fileName = file.name;
      try {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          fileType = "pdf";
          const buffer = await file.arrayBuffer();
          content = await extractPdfText(buffer);
          if (!content || content.trim().length < 10) {
            msg.innerHTML = `
              <div class="message error">
                <strong>Could not extract readable text from this PDF.</strong>
                Most often this means the PDF is a scanned image, uses non-standard fonts, or is encrypted.
                Please copy and paste the text into the <em>Document Text</em> box instead.
              </div>
            `;
            return;
          }
          msg.innerHTML = `<p class="subtext">Extracted ${content.trim().length} characters from PDF.</p>`;
        } else {
          fileType = file.type || "text";
          content = await file.text();
        }
      } catch (err) {
        msg.innerHTML = `<div class="message error">Failed to read file: ${escapeHtml(err.message)}</div>`;
        return;
      }
    }

    if (!content || content.trim().length < 10) {
      msg.innerHTML = `<div class="message error">The file or text box is empty. Please add HR document content first.</div>`;
      return;
    }

    const pairs = parseQA(content);
    let qaSaved = false;
    let docSaved = false;

    try {
      msg.innerHTML = `<p class="subtext">Saving…</p>`;

      // Always save the full document text so the agent can answer from paragraphs.
      await gadget.uploadDocument(location, fileName, content);
      docSaved = true;

      // Also save explicit Q&A pairs if they are present.
      if (pairs.length > 0) {
        await gadget.uploadBatch(location, pairs);
        qaSaved = true;
      }

      if (qaSaved) {
        msg.innerHTML = `<div class="message success">Added ${pairs.length} Q&A pair(s) and saved the full document text for ${escapeHtml(location)}.</div>`;
      } else {
        msg.innerHTML = `<div class="message success">No Q&A markers found, so the document was saved as raw text. Employees can now ask questions about its content.</div>`;
      }

      document.getElementById("doc-text").value = "";
      fileInput.value = "";
      await refreshQAList();
    } catch (err) {
      msg.innerHTML = `<div class="message error">Upload failed: ${escapeHtml(err.message)}</div>`;
    }
  });

  document.getElementById("view-location").addEventListener("change", refreshQAList);

  const clearBtn = document.getElementById("clear-location");
  clearBtn.addEventListener("click", async () => {
    const location = document.getElementById("view-location").value;
    if (clearBtn.textContent === "Clear selected location") {
      clearBtn.textContent = `Click again to clear ${location}`;
      setTimeout(() => {
        clearBtn.textContent = "Clear selected location";
      }, 3500);
      return;
    }
    try {
      await gadget.clearLocation(location);
      clearBtn.textContent = "Clear selected location";
      await refreshQAList();
    } catch (err) {
      msg.innerHTML = `<div class="message error">Failed to clear: ${escapeHtml(err.message)}</div>`;
      clearBtn.textContent = "Clear selected location";
    }
  });
}

async function refreshQAList() {
  const listEl = document.getElementById("qa-list");
  const location = document.getElementById("view-location").value;
  if (!listEl || !location) return;
  try {
    const [items, docs] = await Promise.all([
      gadget.getQuestions(location),
      gadget.getDocuments(location),
    ]);

    let html = "";
    if (docs.length > 0) {
      html += `<li style="border:none;padding-left:0;color:var(--muted)">Stored full document(s): ${docs.map((d) => escapeHtml(d.title)).join(", ")}</li>`;
    }

    if (items.length === 0) {
      if (docs.length === 0) {
        html += `<li style="border:none;padding-left:0;color:var(--muted)">No documents uploaded yet for ${escapeHtml(location)}.</li>`;
      }
      listEl.innerHTML = html;
      return;
    }

    html += items
      .map(
        (item) => `
          <li>
            <strong>${escapeHtml(item.question)}</strong>
            <div>${escapeHtml(item.answer)}</div>
          </li>
        `
      )
      .join("");

    listEl.innerHTML = html;
  } catch (err) {
    listEl.innerHTML = `<li style="color:var(--danger)">Error loading list: ${escapeHtml(err.message)}</li>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function extractPdfText(buffer) {
  const fullBytes = new Uint8Array(buffer);
  const fullLatin = new TextDecoder("latin1").decode(fullBytes);
  let text = "";

  function extractStringsFromBlock(block) {
    const parts = [];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let m;
    while ((m = tjRegex.exec(block)) !== null) {
      parts.push(unescapePdfString(m[1]));
    }
    const tjArrayRegex = /\[\s*([\s\S]*?)\s*\]\s*TJ/g;
    while ((m = tjArrayRegex.exec(block)) !== null) {
      const arrText = m[1];
      const strRegex = /\(([^)]*)\)/g;
      let sm;
      while ((sm = strRegex.exec(arrText)) !== null) {
        parts.push(unescapePdfString(sm[1]));
      }
    }
    return parts.join(" ");
  }

  // Walk PDF objects and decompress FlateDecode streams.
  const objRegex = /(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj\b/g;
  let match;
  while ((match = objRegex.exec(fullLatin)) !== null) {
    const objHeader = match[1] + " " + match[2] + " obj";
    const objBody = match[3];
    const streamIdx = objBody.indexOf("stream");
    const endStreamIdx = objBody.lastIndexOf("endstream");
    if (streamIdx !== -1 && endStreamIdx !== -1 && endStreamIdx > streamIdx) {
      const headerStart = fullLatin.indexOf(objHeader, match.index);
      const streamLiteralStart = fullLatin.indexOf("stream", headerStart);
      let dataStart = streamLiteralStart + 6;
      if (fullLatin.charCodeAt(dataStart) === 13) dataStart++;
      if (fullLatin.charCodeAt(dataStart) === 10) dataStart++;
      const endStreamLiteralStart = fullLatin.indexOf("endstream", dataStart);
      let dataEnd = endStreamLiteralStart;
      while (
        dataEnd > dataStart &&
        (fullLatin.charCodeAt(dataEnd - 1) === 10 || fullLatin.charCodeAt(dataEnd - 1) === 13)
      ) {
        dataEnd--;
      }

      if (dataEnd > dataStart) {
        const streamBytes = fullBytes.slice(dataStart, dataEnd);
        let decodedStream = "";
        const filterMatch = objBody.match(/\/Filter\s*\/FlateDecode/i);
        if (filterMatch) {
          try {
            const ds = new DecompressionStream("deflate-raw");
            const writer = ds.writable.getWriter();
            writer.write(streamBytes);
            writer.close();
            decodedStream = await new Response(ds.readable).text();
          } catch {
            // Decompression failed; keep decodedStream empty.
          }
        }

        const blocksRegex = /BT\s*([\s\S]*?)\s*ET/g;
        for (const source of [objBody, decodedStream]) {
          if (!source) continue;
          let bm;
          while ((bm = blocksRegex.exec(source)) !== null) {
            text += extractStringsFromBlock(bm[1]) + "\n";
          }
        }
      }
    }
  }

  // Fallback for completely uncompressed text operators.
  if (!text.trim()) {
    const blocksRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let bm;
    while ((bm = blocksRegex.exec(fullLatin)) !== null) {
      text += extractStringsFromBlock(bm[1]) + "\n";
    }
  }

  return text;
}

function unescapePdfString(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === "n") {
        out += "\n";
        i++;
      } else if (next === "r") {
        out += "\r";
        i++;
      } else if (next === "t") {
        out += "\t";
        i++;
      } else if (next === "b") {
        out += "\b";
        i++;
      } else if (next === "f") {
        out += "\f";
        i++;
      } else if (next === "(" || next === ")" || next === "\\") {
        out += next;
        i++;
      } else if (/\d/.test(next) && i + 3 < s.length) {
        const oct = s.slice(i + 1, i + 4);
        if (/^\d{3}$/.test(oct)) {
          const code = parseInt(oct, 8);
          if (code > 0) {
            out += String.fromCharCode(code);
            i += 3;
            continue;
          }
        }
        out += c;
      } else {
        out += c;
      }
    } else {
      out += c;
    }
  }
  return out;
}

render();

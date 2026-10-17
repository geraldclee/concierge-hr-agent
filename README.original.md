# Interactive HR Agent

A simple, self-contained HR assistant Gadget. Employees enter their work email and location (Singapore or Switzerland) and ask routine HR questions. The agent answers only from HR documents that HR has uploaded for that location.

## How it answers

The agent stores documents in two ways:
- **Full document search** — the default. Upload any HR policy document and the agent finds the paragraph most relevant to the employee's question.
- **Exact Q&A** — optional. Format the file with `Q:` and `A:` markers for faster, direct answers.

## How to use

### For employees
1. Open the **Ask a Question** tab.
2. Enter your work email.
3. Select your location.
4. Type your question.
5. The agent searches uploaded HR documents for that location and returns the closest matching answer.

### For HR administrators
1. Open the **HR Admin** tab.
2. Unlock the panel with the password `hradmin`.
3. Choose the document location (Singapore or Switzerland).
4. Upload a `.txt` / `.json` / `.pdf` file, or paste the document text.
5. Click **Upload / Add Q&A**.
6. Use the **Current Q&A** section to review uploaded documents and Q&A for a location.

## Supported upload formats

### Plain text file (.txt)
You can upload a full policy document as-is:
```
LEAVE POLICY

Annual Leave
All Singapore employees are entitled to 14 days of paid annual leave per calendar year.

Medical Leave
Employees may take up to 14 days of paid outpatient medical leave with a valid medical certificate.
```

Or format it as Q&A:
```
Q: What is the annual leave entitlement?
A: Employees receive 14 days of annual leave per year.

Q: How do I claim medical expenses?
A: Submit your receipts through the HR portal within 30 days.
```

### JSON file (.json)
```json
[
  {
    "question": "What is the annual leave entitlement?",
    "answer": "Employees receive 14 days of annual leave per year."
  },
  {
    "question": "How do I claim medical expenses?",
    "answer": "Submit your receipts through the HR portal within 30 days."
  }
]
```

### PDF file (.pdf)
You can upload text-based PDFs. The agent extracts text from internal `BT ... ET` blocks and compressed `FlateDecode` streams.
- Works best when the PDF contains selectable text (not scanned images).
- Word `.doc`/`.docx` files are not supported directly. Save or export Word files as PDF, or copy and paste the text.
- If extraction fails, copy and paste the text from the PDF into the text box instead.
- Avoid uploading files with embedded images only.

## Troubleshooting

**"I clicked Upload but nothing happened"**
Check the message that appears under the Upload button:
- **"No Q&A markers found, so the document was saved as raw text"** means the upload worked. Employees can now ask questions about the document content.
- **"Could not extract readable text"** means the PDF is probably a scanned image or uses a font the extractor cannot read. Copy-paste the text instead.
- **"Upload failed"** with an error message suggests a server problem — please share the exact message.
- Make sure a **location** is selected before clicking Upload.

## Notes

- The agent performs keyword matching against uploaded documents and questions, so answers are strictly limited to the uploaded HR documents.
- Each location has its own independent set of documents and Q&A pairs.
- The admin password is currently hard-coded in `client.js` as `hradmin`. Change it in production use.
- No AI model is used unless an AI binding is wired into the environment; matching is done on the server with simple keyword scoring.

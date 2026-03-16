import { getSupportingDoc, downloadSupportingDoc } from '../../utils/orchestrator.js';
import { formatHeader, formatField, formatDate } from '../../utils/format.js';

export async function showSupportingDocHandler(argv) {
  const { id, save, json } = argv;

  try {
    const response = await getSupportingDoc(id);
    const doc = response.data;

    if (json) {
      console.log(JSON.stringify(doc, null, 2));
      return;
    }

    // Metadata header
    console.log(formatHeader('Supporting Document', doc.id));
    console.log('');
    const lw = 16;
    console.log(formatField('Title', doc.title, lw));
    console.log(formatField('Type', doc.type, lw));
    console.log(formatField('Step', doc.step_slug, lw));
    if (doc.filename) console.log(formatField('Filename', doc.filename, lw));
    if (doc.mime_type) console.log(formatField('MIME Type', doc.mime_type, lw));
    if (doc.size_bytes) console.log(formatField('Size', `${doc.size_bytes} bytes`, lw));
    console.log(formatField('Work Record', doc.work_record_id, lw));
    console.log(formatField('Created', formatDate(doc.created_at), lw));

    // Content for markdown docs
    if (doc.type === 'markdown' && doc.content) {
      console.log('\n--- Content ---\n');
      console.log(doc.content);
    }

    // File type: hint or download
    if (doc.type === 'file') {
      if (save) {
        const savedPath = await downloadSupportingDoc(id, save);
        console.log(`\nSaved to: ${savedPath}`);
      } else {
        console.log(`\nUse --save <path> to download this file.`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

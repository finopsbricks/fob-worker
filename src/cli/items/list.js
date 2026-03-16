import { listItems } from '../../utils/orchestrator.js';
import { formatTable, formatDate } from '../../utils/format.js';

export async function listItemsHandler(argv) {
  const { type, status, tag, json } = argv;

  const filters = [];
  if (type) filters.push(`type=${type}`);
  if (status) filters.push(`status=${status}`);
  if (tag) filters.push(`tag=${tag}`);
  if (filters.length > 0) {
    console.log(`Filters: ${filters.join(', ')}`);
  }
  console.log('');

  try {
    const response = await listItems({ type, status, tag });
    const items = response.data || [];

    if (items.length === 0) {
      console.log('No items found');
      return;
    }

    if (json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    const rows = items.map(item => [
      item.id,
      item.type || '—',
      item.status || '—',
      item.name || '—',
      formatDate(item.created_at),
    ]);

    console.log(formatTable(['ID', 'TYPE', 'STATUS', 'NAME', 'CREATED'], rows));
    console.log('');
    console.log(`Total: ${items.length} items`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

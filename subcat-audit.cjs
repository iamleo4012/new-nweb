const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
(async () => {
  const rows = await p.subcategory.findMany({
    select: { slug: true, name: true, category: { select: { name: true, slug: true } } },
    orderBy: [{ category: { id: 'asc' } }, { id: 'asc' }],
  });
  console.log('=== DB subcategories by category ===');
  const byCat = {};
  rows.forEach((r) => (byCat[r.category.name] = byCat[r.category.name] || []).push(r.name + ' (' + r.slug + ')'));
  Object.keys(byCat).forEach((c) => console.log('  ' + c + ': ' + byCat[c].join(', ')));

  // Compare with each page's own filter buttons (source of truth for chips)
  const pages = {
    'Cleaning Tools': 'public/houseware-cleaning-tools.html',
    'Home & Outdoor': 'public/houseware-home-outdoor.html',
    'Kitchenware': 'public/houseware-kitchenware.html',
    'Cooling Appliances': 'public/supermarket-cooling-appliances.html',
    'Trolleys & Baskets (supermarket)': 'public/supermarket-trolleys-baskets.html',
    'Shelves & Stands': 'public/supermarket-shelves-stands.html',
    'Trolleys & Baskets (warehouse)': 'public/warehouse-trolleys-baskets.html',
    'Forklifts & Pallets': 'public/warehouse-forklifts-pallets.html',
  };
  console.log('\n=== page buttons (hidden .subcat-tabs section) ===');
  Object.entries(pages).forEach(([label, file]) => {
    const html = fs.readFileSync(file, 'utf8');
    const m = /<section class="subcat-tabs"[^>]*>([\s\S]*?)<\/section>/.exec(html);
    const btns = m ? [...m[1].matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map((b) => b[1].replace(/&amp;/g, '&').trim()) : [];
    console.log('  ' + label + ': ' + btns.join(' | '));
  });
  await p.$disconnect();
})();

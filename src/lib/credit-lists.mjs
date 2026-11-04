// Turns lists of credits, where every item is "**Name**, Role" (or "**Name** and **Name**, Role"), into a credits
// list (class "crew-list"): each item becomes a name and a role that can sit side by side on wide screens and stack
// cleanly on phones. A bold-only paragraph right before such a list ("**The stages**") is its heading ("crew-head").
// Anything else, like bullets with links or longer sentences, is left alone.
// A hast plugin for Astro's Markdown processor, Sätteri.
const blank = (ctx, n) => n.type === 'text' && !ctx.textContent(n).trim();
const el = (tagName, className, children) => ({ type: 'element', tagName, properties: { className: [className] }, children });

function split(ctx, li) {
  const kids = li.children.filter((n) => !blank(ctx, n));
  const last = kids.at(-1);
  if (kids.length < 2 || kids[0].tagName !== 'strong' || last?.type !== 'text') return null;
  const m = /^,\s*(.+?)\s*$/.exec(ctx.textContent(last));
  if (!m || m[1].split(/\s+/).length > 8) return null;
  const names = kids.slice(0, -1);
  const ok = names.every((n) => n.tagName === 'strong' || (n.type === 'text' && /^\s*(and|,)\s*$/.test(ctx.textContent(n))));
  return ok ? { names, role: m[1] } : null;
}

export default {
  name: 'strukt-credit-lists',
  element: {
    filter: ['ul'],
    visit(ul, ctx) {
      const items = ul.children.filter((n) => n.tagName === 'li');
      if (items.length < 1 || ul.children.some((n) => n.tagName !== 'li' && !blank(ctx, n))) return;
      const parts = items.map((li) => split(ctx, li));
      if (parts.some((p) => !p)) return;
      items.forEach((li, k) => {
        const names = parts[k].names.map((n) => (n.type === 'text' ? { type: 'text', value: ` ${ctx.textContent(n).trim()} ` } : n));
        ctx.replaceNode(li, { type: 'element', tagName: 'li', properties: {}, children: [el('span', 'who', names), el('span', 'role', [{ type: 'text', value: parts[k].role }])] });
      });
      ctx.setProperty(ul, 'className', ['crew-list']);
      const sibs = ctx.parent(ul).children;
      let k = ctx.indexOf(ul) - 1;
      while (k >= 0 && blank(ctx, sibs[k])) k--;
      const prev = sibs[k];
      const prevKids = prev?.tagName === 'p' ? prev.children.filter((n) => !blank(ctx, n)) : [];
      if (prevKids.length === 1 && prevKids[0].tagName === 'strong') ctx.setProperty(prev, 'className', ['crew-head']);
    },
  },
};

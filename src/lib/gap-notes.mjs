// Marks the italic editor's notes in posts ("We couldn't find...", "That engineer is never named...") with class "gap"
// so they can be styled as notes rather than ordinary emphasis. A note that's split around a title, like
// *...on Lake's* Chemistry *shows.*, is joined into one note with the title kept upright (class "t").
// A list item that is only a note gets class "gap-line", and so does every item of a list made only of italic
// lines, like the "names still missing" lists, which are notes even when they don't say so.
// A hast plugin for Astro's Markdown processor, Sätteri.
const GAP = /^\s*we only know|we couldn['’]t (find|confirm)|never named|doesn['’]t name|credited only by that name|nobody who made/i;

const blank = (ctx, n) => n.type === 'text' && !ctx.textContent(n).trim();
const onlyEm = (ctx, li) => {
  const kids = li.children.filter((n) => !blank(ctx, n));
  return kids.length === 1 && kids[0].tagName === 'em';
};

export default {
  name: 'strukt-gap-notes',
  element: {
    filter: ['em'],
    visit(em, ctx) {
      const parent = ctx.parent(em);
      const list = parent.tagName === 'li' ? ctx.parent(parent) : null;
      const items = list ? list.children.filter((n) => n.tagName === 'li') : [];
      const italicList = items.length > 1 && items.every((li) => onlyEm(ctx, li));
      if (!italicList && !GAP.test(ctx.textContent(em))) return;
      const siblings = parent.children;
      const start = ctx.indexOf(em);
      let i = start;
      const children = [...em.children];
      // *note* Title *note continued* -> one note
      while (siblings[i + 1]?.type === 'text' && siblings[i + 2]?.tagName === 'em') {
        children.push({ type: 'element', tagName: 'span', properties: { className: ['t'] }, children: [{ type: 'text', value: ctx.textContent(siblings[i + 1]) }] }, ...siblings[i + 2].children);
        ctx.removeNode(siblings[i + 1]);
        ctx.removeNode(siblings[i + 2]);
        i += 2;
      }
      ctx.replaceNode(em, { type: 'element', tagName: 'em', properties: { className: ['gap'] }, children });
      // a list item that is nothing but the note uses its own bullet as the note's dot
      const rest = siblings.filter((n, k) => (k < start || k > i) && !blank(ctx, n));
      if (parent.tagName === 'li' && !rest.length) ctx.setProperty(parent, 'className', ['gap-line']);
    },
  },
};

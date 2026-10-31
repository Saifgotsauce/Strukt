// Marks the italic "We couldn't find..." notes in posts (class "gap") so they can be styled as editor's notes rather
// than ordinary emphasis. A note that's split around a title, like *...on Lake's* Chemistry *shows.*, is joined into
// one note with the title kept upright (class "t"). A list item that is only a note gets class "gap-line".
// A hast plugin for Astro's Markdown processor, Sätteri.
const GAP = /^\s*(we couldn['’]t find|we only know)/i;

export default {
  name: 'strukt-gap-notes',
  element: {
    filter: ['em'],
    visit(em, ctx) {
      if (!GAP.test(ctx.textContent(em))) return;
      const siblings = ctx.parent(em).children;
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
      const parent = ctx.parent(em);
      const rest = siblings.filter((n, k) => (k < start || k > i) && !(n.type === 'text' && !ctx.textContent(n).trim()));
      if (parent.tagName === 'li' && !rest.length) ctx.setProperty(parent, 'className', ['gap-line']);
    },
  },
};

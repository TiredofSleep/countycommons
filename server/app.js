// Clark Commons — server. One process, server-rendered pages, no external
// requests. Routes /issues, /results, /ask are reserved for later milestones.

const express = require('express');
const path = require('path');
const { load } = require('./lib/corpus');
const { treePage } = require('./views/tree');
const { nodePage } = require('./views/node');
const { docketPage, documentsPage, verifyPage, methodologyPage } = require('./views/pages');
const { comparePage } = require('./views/compare');
const { storyPage } = require('./views/story');

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => res.send(treePage(load())));

app.get('/line/:id', (req, res) => {
  const data = load();
  const node = data.byId.get(req.params.id);
  if (!node) return res.status(404).send(notFound(data, 'No line with that id exists in the corpus.'));
  res.send(nodePage(data, node));
});

app.get('/story', (req, res) => res.send(storyPage(load())));

app.get('/compare/:id', (req, res) => {
  const data = load();
  const cmp = data.comparisons.comparisons.find(c => c.id === req.params.id);
  if (!cmp) return res.status(404).send(notFound(data, 'No comparison with that id exists.'));
  res.send(comparePage(data, cmp));
});

app.get('/docket', (req, res) => res.send(docketPage(load())));
app.get('/documents', (req, res) => res.send(documentsPage(load())));
app.get('/verify', (req, res) => res.send(verifyPage(load())));
app.get('/methodology', (req, res) => res.send(methodologyPage(load())));

// Reserved for later milestones — honest about it rather than 404.
for (const route of ['/issues', '/results', '/ask']) {
  app.get(route, (req, res) => {
    const data = load();
    res.status(404).send(notFound(data,
      'This part of the platform is not built yet. The budget engine comes first; issues, results, and Q&A follow.'));
  });
}

app.use((req, res) => res.status(404).send(notFound(load(), 'That page does not exist.')));

function notFound(data, msg) {
  const { layout } = require('./views/layout');
  return layout({
    title: `Not here — ${data.county.platform_name}`, current: null, county: data.county,
    body: `<header class="page"><h1>Not here</h1><div class="src">${msg} <a href="/">Back to the money trail</a>.</div></header>`
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Clark Commons listening on http://localhost:${PORT}`));

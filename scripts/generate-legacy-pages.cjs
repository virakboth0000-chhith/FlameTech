const fs = require('fs');
const path = require('path');

const pages = [
  'Flametech.html',
  'h.html',
  'AI.html',
  'dev.html',
  'codeL.html',
  'reference.html',
  'TT.html',
  'l-r.html',
  'd.html',
  'g.html',
  'Tool.html',
  'hj.html',
  'setting.html',
  'playlist.html',
];

const routes = {
  'Flametech.html': '/',
  'h.html': '/home',
  'AI.html': '/ai',
  'dev.html': '/development',
  'codeL.html': '/code-languages',
  'reference.html':'/cheatsheet',
  'TT.html': '/typing-practice',
  'l-r.html': '/login',
  'd.html': '/contribute',
  'g.html': '/learning-plan',
  'Tool.html': '/ai-tool',
  'hj.html': '/qr-code',
  'setting.html': '/settings',
  'playlist.html': '/playlist',
};

const data = pages.map((filename) => {
  const html = fs.readFileSync(path.join(process.cwd(), filename), 'utf8');
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || filename;

  return {
    filename,
    route: routes[filename],
    title,
    html,
  };
});

const output = `export type LegacyPage = { filename: string; route: string; title: string; html: string };

export const legacyPages = ${JSON.stringify(data, null, 2)} satisfies LegacyPage[];

export const defaultFilename = "Flametech.html";
`;

fs.writeFileSync(path.join(process.cwd(), 'src', 'legacyPages.ts'), output);

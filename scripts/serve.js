import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".csv": "text/csv" };

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
  let file = join(root, relative || "index.html");
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  response.setHeader("Content-Type", `${types[extname(file)] || "application/octet-stream"}; charset=utf-8`);
  response.setHeader("Cache-Control", "no-store");
  createReadStream(file).pipe(response);
}).listen(port, () => console.log(`Draft Command Center: http://localhost:${port}`));

import express from "express";
import morgan from "morgan";
import cors from "cors";
import { Products, Categories } from "./data.js";
import { readFileSync } from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(morgan("dev"));

function applySelect(items, select) {
  if (!select) return items;
  const fields = select.split(",").map(s => s.trim());
  return items.map(it => {
    const o = {};
    for (const f of fields) o[f] = it[f];
    return o;
  });
}

function applyFilter(items, filter) {
  if (!filter) return items;
  // very naive parser supporting eq, gt, lt and `and`/`or`
  const ops = { " eq ": "===", " gt ": ">", " lt ": "<" };
  let expr = filter;
  for (const [k, v] of Object.entries(ops)) expr = expr.replaceAll(k, ` ${v} `);
  expr = expr.replaceAll(" and ", " && ").replaceAll(" or ", " || ");
  return items.filter(it => {
    try {
      // turn identifiers into property lookups
      let e = expr.replace(/([A-Za-z_][A-Za-z0-9_]*)/g, "it.$1");
      // unwrap quoted strings and numbers are left as-is
      // eslint disabled in mock context
      // Using Function for brevity in mock; do not do this in production.
      return Function("it", `return (${e});`)(it);
    } catch { return false; }
  });
}

function applyOrder(items, orderby) {
  if (!orderby) return items;
  const [field, dir] = orderby.split(" ");
  const d = (dir || "asc").toLowerCase() === "desc" ? -1 : 1;
  return items.slice().sort((a,b) => (a[field] > b[field] ? d : -d));
}

function applyTopSkip(items, top, skip) {
  const s = parseInt(skip || "0", 10);
  const t = parseInt(top || String(items.length), 10);
  return items.slice(s, s + t);
}

function expand(items, expand) {
  if (!expand) return items;
  const ex = expand.split(",").map(s => s.trim());
  return items.map(it => {
    const o = { ...it };
    if (ex.includes("Category") && it.CategoryId) {
      o.Category = Categories.find(c => c.Id === it.CategoryId);
    }
    if (ex.includes("Products") && it.Id != null) {
      o.Products = Products.filter(p => p.CategoryId === it.Id);
    }
    return o;
  });
}

app.get("/odata/$metadata", (req, res) => {
  const xml = readFileSync(path.join(__dirname, "metadata.xml"), "utf8");
  res.setHeader("Content-Type", "application/xml");
  res.send(xml);
});

app.get("/odata/Products", (req, res) => {
  let items = Products.slice();
  items = applyFilter(items, req.query["$filter"]);
  items = applyOrder(items, req.query["$orderby"]);
  items = applyTopSkip(items, req.query["$top"], req.query["$skip"]);
  items = expand(items, req.query["$expand"]);
  items = applySelect(items, req.query["$select"]);
  res.json({ "@odata.context": "$metadata#Products", value: items });
});

app.get("/odata/Categories", (req, res) => {
  let items = Categories.slice();
  items = applyFilter(items, req.query["$filter"]);
  items = applyOrder(items, req.query["$orderby"]);
  items = applyTopSkip(items, req.query["$top"], req.query["$skip"]);
  items = expand(items, req.query["$expand"]);
  items = applySelect(items, req.query["$select"]);
  res.json({ "@odata.context": "$metadata#Categories", value: items });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`sap-odata-v4 listening on :${PORT}`));

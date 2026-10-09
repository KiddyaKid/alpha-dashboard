// Official mdxcn Knap filters (https://mdxcn.dev/r/graph-knap.json), bundled unmodified with esbuild
// so plain Node can run them without a React/TS build. Rebuild: see UPDATE.md "mdxcn figures".
// Output = the official fenced ASCII from https://mdxcn.dev/llms.txt. Do not hand-edit.
// ../knap/registry/default/graph-knap/frame.ts
var MIN_INNER = 48;
function widthOf(text) {
  return text.length;
}
function padEnd(text, size) {
  const extra = size - widthOf(text);
  if (extra > 0) {
    return text + " ".repeat(extra);
  }
  return text.slice(0, size);
}
function padStart(text, size) {
  const extra = size - widthOf(text);
  if (extra > 0) {
    return " ".repeat(extra) + text;
  }
  return text.slice(-size);
}
function dash(count) {
  return "-".repeat(Math.max(0, count));
}
function wrapText(text, width = 56) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}
function frameAscii(title, lines, minInner = MIN_INNER) {
  const caption = title?.trim() ? `[ ${title.trim().toUpperCase()} ]` : "";
  const contentWidth = Math.max(0, ...lines.map(widthOf));
  const inner = Math.max(
    minInner,
    contentWidth,
    caption ? caption.length + 4 : 0
  );
  const span = inner + 2;
  const empty = `| ${" ".repeat(inner)} |`;
  const body = lines.map((line) => `| ${padEnd(line, inner)} |`);
  const top = caption ? (() => {
    const label = ` ${caption} `;
    const leftover = Math.max(0, span - label.length);
    const left = Math.floor(leftover / 2);
    const right = leftover - left;
    return `+${dash(left)}${label}${dash(right)}+`;
  })() : `+${dash(span)}+`;
  return [top, empty, ...body, empty, `+${dash(span)}+`].join("\n");
}
function rule(size) {
  return dash(size);
}
function fillTrack(filled, total, on = "=", off = "-") {
  const count = Math.min(total, Math.max(0, filled));
  return on.repeat(count) + off.repeat(total - count);
}
function col(text, size, align = "left") {
  return align === "right" ? padStart(text, size) : padEnd(text, size);
}
function colWidth(values) {
  return Math.max(0, ...values.map(widthOf));
}
function fence(ascii) {
  return `\`\`\`
${ascii}
\`\`\``;
}

// ../knap/registry/default/graph-knap/graphs.ts
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
var SPARK = ["\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588"];
var STACK = ["\u2588", "\u2593", "\u2592", "\u2591", "#", "=", "+", "-"];
var SHADE = ["\xB7", "\u2591", "\u2592", "\u2593", "\u2588"];
function sparkGlyphs(data) {
  const max = Math.max(...data, 1);
  return data.map((value) => {
    const index = Math.round(value / max * (SPARK.length - 1));
    return SPARK[index] ?? SPARK[0] ?? "\u2581";
  });
}
function asciiMeter({
  title,
  value,
  ticks = 14,
  caption
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const filled = Math.round(clamped * ticks);
  const lines = [`[${fillTrack(filled, ticks)}]  ${Math.round(clamped * 100)}%`];
  if (caption) {
    lines.push(caption);
  }
  return frameAscii(title, lines);
}
function asciiRank({
  title,
  items,
  max,
  ticks = 20
}) {
  const peak = max ?? Math.max(...items.map((item) => item.value), 1);
  const labels = colWidth(items.map((item) => item.label));
  const values = items.map(
    (item) => item.display ? item.display : item.value.toLocaleString("en-US", {
      maximumFractionDigits: Number.isInteger(item.value) ? 0 : 1
    })
  );
  const valueWidth = colWidth(values);
  return frameAscii(
    title,
    items.map((item, index) => {
      const filled = Math.min(
        ticks,
        Math.round(Math.max(item.value, 0) / peak * ticks)
      );
      return `${col(item.label, labels)}  [${fillTrack(filled, ticks)}]  ${col(values[index] ?? "", valueWidth, "right")}`;
    })
  );
}
function asciiSpark({
  title,
  data,
  caption
}) {
  const lines = [sparkGlyphs(data).join("")];
  if (caption) {
    lines.push(caption);
  }
  return frameAscii(title, lines);
}
function asciiBullet({
  title,
  items,
  ticks = 20
}) {
  const labels = colWidth(items.map((item) => item.label));
  const values = items.map((item) => {
    if (item.display) {
      return item.display;
    }
    const value = item.value.toLocaleString("en-US", {
      maximumFractionDigits: Number.isInteger(item.value) ? 0 : 1
    });
    if (item.target == null) {
      return value;
    }
    const target = item.target.toLocaleString("en-US", {
      maximumFractionDigits: Number.isInteger(item.target) ? 0 : 1
    });
    return `${value} / ${target}`;
  });
  const valueWidth = colWidth(values);
  return frameAscii(
    title,
    items.map((item, index) => {
      const peak = item.max ?? Math.max(item.value, item.target ?? 0, 1);
      const filled = Math.min(
        ticks,
        Math.round(Math.max(item.value, 0) / peak * ticks)
      );
      const mark = item.target == null ? null : Math.min(
        ticks - 1,
        Math.max(0, Math.round(Math.max(item.target, 0) / peak * ticks))
      );
      const cells = Array.from({ length: ticks }, (_, cell) => {
        if (mark != null && cell === mark) {
          return "|";
        }
        return cell < filled ? "=" : "-";
      }).join("");
      return `${col(item.label, labels)}  [${cells}]  ${col(values[index] ?? "", valueWidth, "right")}`;
    })
  );
}
function asciiStack({
  title,
  rows,
  ticks = 24
}) {
  const labels = colWidth(rows.map((row) => row.label));
  const legend = [];
  for (const row of rows) {
    for (const segment of row.segments) {
      if (!legend.includes(segment.label)) {
        legend.push(segment.label);
      }
    }
  }
  const painted = rows.map((row) => {
    const total = row.segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
    let left = ticks;
    const pieces = row.segments.map((segment, index) => {
      const raw = Math.round(segment.value / total * ticks);
      const count = index === row.segments.length - 1 ? Math.max(0, left) : Math.min(Math.max(0, raw), left);
      left -= count;
      const glyph = STACK[legend.indexOf(segment.label) % STACK.length] ?? "\u2588";
      return glyph.repeat(count);
    });
    return `${col(row.label, labels)}  ${pieces.join("")}`;
  });
  const key = legend.map((label, index) => {
    const glyph = STACK[index % STACK.length] ?? "\u2588";
    return `${glyph} ${label}`;
  }).join("  ");
  return frameAscii(title, [...painted, "", key]);
}
function asciiDiff({
  title,
  rows,
  footer
}) {
  const all = footer ? [...rows, footer] : rows;
  const labels = colWidth(all.map((row) => row.label));
  const values = colWidth(all.map((row) => row.value));
  function line(row) {
    const sign = row.sign === "add" ? "+" : row.sign === "remove" ? "-" : " ";
    return `${sign} ${col(row.label, labels)}  ${col(row.value, values, "right")}`;
  }
  const lines = rows.map(line);
  if (footer) {
    lines.push(rule(2 + labels + 2 + values), line(footer));
  }
  return frameAscii(title, lines);
}
function asciiTimeline({
  title,
  events
}) {
  const dates = colWidth(events.map((event) => event.date));
  const lines = [];
  const indent = " ".repeat(3 + dates + 2);
  events.forEach((event, index) => {
    const mark = event.state === "next" ? "\u25CB" : "\u25CF";
    const last = index === events.length - 1;
    lines.push(`${mark}  ${col(event.date, dates)}  ${event.label}`);
    if (event.note) {
      wrapText(event.note, 48).forEach(
        (line) => lines.push(`${last ? " " : "\u2502"}${indent.slice(1)}${line}`)
      );
    }
    if (!last) {
      lines.push(`\u2502`);
    }
  });
  return frameAscii(title, lines);
}
function cellText(value) {
  if (typeof value === "boolean") {
    return value ? "\u2713" : "\u2013";
  }
  return value;
}
function gridLines({
  headers,
  rows,
  footer,
  align
}) {
  const all = [headers, ...rows, ...footer ? [footer] : []];
  const count = Math.max(1, ...all.map((row) => row.length));
  const widths = Array.from(
    { length: count },
    (_, index) => colWidth(all.map((row) => row[index] ?? ""))
  );
  function side(index) {
    return align?.[index] ?? (index === 0 ? "left" : "right");
  }
  function cells(row) {
    return Array.from(
      { length: count },
      (_, index) => col(row[index] ?? "", widths[index] ?? 0, side(index))
    ).join(" | ");
  }
  function ruleLine() {
    return widths.map((width) => rule(width)).join("-+-");
  }
  const lines = [cells(headers), ruleLine(), ...rows.map(cells)];
  if (footer) {
    lines.push(ruleLine(), cells(footer));
  }
  return { lines, cells, ruleLine };
}
function asciiCompare({
  title,
  columns,
  rows
}) {
  return frameAscii(
    title,
    gridLines({
      headers: ["", ...columns],
      rows: rows.map((row) => [
        row.label,
        ...row.values.map((value) => cellText(value))
      ]),
      align: ["left", ...columns.map(() => "right")]
    }).lines
  );
}
function asciiMatrix({
  title,
  columns,
  rows
}) {
  return asciiCompare({
    title,
    columns,
    rows: rows.map((row) => ({
      label: row.label,
      values: row.values.map(
        (value) => typeof value === "number" ? value.toLocaleString("en-US", {
          maximumFractionDigits: Number.isInteger(value) ? 0 : 1
        }) : value
      )
    }))
  });
}
function asciiTable({
  title,
  headers,
  rows,
  footer,
  align
}) {
  return frameAscii(title, gridLines({ headers, rows, footer, align }).lines);
}
function asciiSheet({
  title,
  headers,
  sections: sections2,
  footer,
  align
}) {
  const grid = gridLines({
    headers,
    rows: sections2.flatMap((section) => section.rows),
    footer,
    align
  });
  const lines = [grid.cells(headers), grid.ruleLine()];
  sections2.forEach((section, index) => {
    if (index > 0) {
      lines.push(grid.ruleLine());
    }
    lines.push(section.title);
    lines.push(...section.rows.map(grid.cells));
  });
  if (footer) {
    lines.push(grid.ruleLine(), grid.cells(footer));
  }
  return frameAscii(title, lines);
}
function asciiCheck({ title, items }) {
  const flat = [];
  const walk = (list, depth) => {
    for (const item of list) {
      flat.push({ item, depth });
      walk(item.items ?? [], depth + 1);
    }
  };
  walk(items, 0);
  const labels = colWidth(
    flat.map(({ item, depth }) => " ".repeat(depth * 5) + item.label)
  );
  return frameAscii(
    title,
    flat.map(({ item, depth }) => {
      const mark = item.done ? "[x]" : "[ ]";
      const note = item.note ? `  ${item.note}` : "";
      const pad = " ".repeat(depth * 5);
      return `${pad}${mark}  ${col(item.label, labels - pad.length)}${note}`;
    })
  );
}
function asciiStat({
  title,
  items
}) {
  const widths = items.map(
    (item) => Math.max(item.value.length, item.label.length, item.hint?.length ?? 0)
  );
  const values = items.map((item, index) => col(item.value, widths[index] ?? 0)).join("   ");
  const labels = items.map((item, index) => col(item.label, widths[index] ?? 0)).join("   ");
  const hints = items.some((item) => item.hint) ? items.map((item, index) => col(item.hint ?? "", widths[index] ?? 0)).join("   ") : null;
  return frameAscii(title, hints ? [values, labels, hints] : [values, labels]);
}
function asciiKpi({
  title,
  value,
  label,
  hint,
  data
}) {
  const meta = hint ? `${label}  ${hint}` : label;
  return frameAscii(title, [value, meta, sparkGlyphs(data).join("")]);
}
function asciiSpec({
  title,
  rows
}) {
  const labels = colWidth(rows.map((row) => row.label));
  return frameAscii(
    title,
    rows.flatMap((row) => [
      `${col(row.label, labels)}  ${row.value}`,
      ...row.note ? wrapText(row.note, 48).map(
        (line) => `${" ".repeat(labels + 2)}${line}`
      ) : []
    ])
  );
}
function asciiFunnel({
  title,
  steps,
  ticks = 20
}) {
  const max = Math.max(...steps.map((step) => step.value), 1);
  const head = steps[0]?.value || 1;
  const labels = colWidth(steps.map((step) => step.label));
  const amounts = steps.map(
    (step) => step.display ?? step.value.toLocaleString()
  );
  const amountWidth = colWidth(amounts);
  return frameAscii(
    title,
    steps.map((step, index) => {
      const width = Math.max(1, Math.round(step.value / max * ticks));
      const percent = Math.round(step.value / head * 100);
      const share = index === 0 ? "    " : col(`${percent}%`, 4, "right");
      return `${col(step.label, labels)}  ${fillTrack(width, ticks, "\u2588", "-")}  ${col(amounts[index] ?? "", amountWidth, "right")}  ${share}`;
    })
  );
}
function asciiWaterfall({
  title,
  items,
  ticks = 24
}) {
  function resolveKind(item, index) {
    if (item.kind) {
      return item.kind;
    }
    if (index === 0) {
      return "start";
    }
    if (index === items.length - 1) {
      return "end";
    }
    return item.value >= 0 ? "in" : "out";
  }
  function formatValue(item, kind) {
    if (item.display) {
      return item.display;
    }
    const absolute = Math.abs(item.value);
    if (kind === "in") {
      return `+${absolute.toLocaleString("en-US")}`;
    }
    if (kind === "out") {
      return `\u2212${absolute.toLocaleString("en-US")}`;
    }
    return item.value.toLocaleString("en-US");
  }
  let run = 0;
  const segments = items.map((entry, index) => {
    const kind = resolveKind(entry, index);
    const magnitude = Math.abs(entry.value);
    if (kind === "start") {
      const from = 0;
      const to = entry.value;
      run = entry.value;
      return { ...entry, kind, from, to };
    }
    if (kind === "in") {
      const from = run;
      const to = run + magnitude;
      run = to;
      return { ...entry, kind, from, to };
    }
    if (kind === "out") {
      const to = run;
      const from = run - magnitude;
      run = from;
      return { ...entry, kind, from, to };
    }
    const total = entry.value;
    run = total;
    return { ...entry, kind, from: 0, to: total };
  });
  const lows = segments.map((segment) => Math.min(segment.from, segment.to));
  const highs = segments.map((segment) => Math.max(segment.from, segment.to));
  const low = Math.min(0, ...lows);
  const high = Math.max(1, ...highs);
  const span = high - low || 1;
  function column(value) {
    return Math.round((value - low) / span * ticks);
  }
  const labels = colWidth(segments.map((segment) => segment.label));
  const amounts = segments.map((segment) => formatValue(segment, segment.kind));
  const amountWidth = colWidth(amounts);
  const lines = [];
  segments.forEach((segment, index) => {
    const start = Math.min(column(segment.from), column(segment.to));
    const end = Math.max(column(segment.from), column(segment.to), start + 1);
    const bar = Array.from(
      { length: ticks },
      (_, cell) => cell >= start && cell < end ? "\u2588" : "-"
    ).join("");
    if (segment.kind === "end" && index > 0) {
      lines.push(rule(labels + 2 + ticks + 2 + amountWidth));
    }
    lines.push(
      `${col(segment.label, labels)}  ${bar}  ${col(amounts[index] ?? "", amountWidth, "right")}`
    );
  });
  return frameAscii(title, lines);
}
function asciiUptime({
  title,
  days,
  from,
  to,
  columns = 30
}) {
  const mark = {
    ok: SHADE[4] ?? "\u2588",
    degraded: SHADE[2] ?? "\u2592",
    down: SHADE[0] ?? "\xB7",
    empty: "-"
  };
  const cols = Math.max(1, columns);
  const rows = [];
  for (let index = 0; index < days.length; index += cols) {
    rows.push(
      days.slice(index, index + cols).map((day) => mark[day]).join("")
    );
  }
  const known = days.filter((day) => day !== "empty");
  const ok = known.filter((day) => day === "ok").length;
  const percent = known.length === 0 ? 0 : Math.round(ok / known.length * 100);
  const range = [from, to].filter(Boolean).join("  ");
  const meta = range ? `${percent}%  ${range}` : `${percent}%`;
  return frameAscii(title, [
    ...rows,
    meta,
    `${mark.ok} up  ${mark.degraded} slow  ${mark.down} down`
  ]);
}
function asciiCells({
  title,
  items
}) {
  const grids = items.map((item) => {
    const body = item.cells.map(
      (row) => row.map((cell) => cell === 1 ? "\u2588" : "\xB7").join(" ")
    );
    const width = colWidth([...body, item.label]);
    return {
      lines: [...body, col(item.label, width)],
      width
    };
  });
  const height = Math.max(...grids.map((grid) => grid.lines.length));
  const gap = "   ";
  const lines = Array.from(
    { length: height },
    (_, row) => grids.map((grid) => col(grid.lines[row] ?? "", grid.width)).join(gap)
  );
  return frameAscii(title, lines);
}
function asciiWaffle({
  title,
  value,
  cells = 100,
  columns = 10,
  caption
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const filled = Math.round(clamped * cells);
  const rows = Math.ceil(cells / columns);
  const lines = [];
  for (let row = 0; row < rows; row++) {
    const glyphs = [];
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column;
      if (index >= cells) {
        glyphs.push(" ");
      } else {
        glyphs.push(index < filled ? "\u2588" : "\u2591");
      }
    }
    lines.push(glyphs.join(" "));
  }
  lines.push(`${Math.round(clamped * 100)}%`);
  if (caption) {
    lines.push(caption);
  }
  return frameAscii(title, lines);
}
function asciiSlope({
  title,
  fromLabel,
  toLabel,
  items
}) {
  function format(value) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 1
    });
  }
  const labels = colWidth(items.map((item) => item.label));
  const froms = colWidth([fromLabel, ...items.map((item) => format(item.from))]);
  const tos = colWidth([toLabel, ...items.map((item) => format(item.to))]);
  const header = `${col("", labels)}  ${col(fromLabel, froms, "right")}  ${col("", 1)}  ${col(toLabel, tos, "right")}`;
  const body = items.map((item) => {
    const arrow = item.to === item.from ? "\u2013" : "\u2192";
    return `${col(item.label, labels)}  ${col(format(item.from), froms, "right")}  ${arrow}  ${col(format(item.to), tos, "right")}`;
  });
  return frameAscii(title, [header, ...body]);
}
function flattenTree(nodes, prefix = "", isRoot = true) {
  const singleRoot = isRoot && nodes.length === 1;
  return nodes.flatMap((node, index) => {
    const last = index === nodes.length - 1;
    const branch = singleRoot ? "" : prefix + (last ? "\u2514\u2500 " : "\u251C\u2500 ");
    const childPrefix = singleRoot ? "" : prefix + (last ? "   " : "\u2502  ");
    const row = { branch, label: node.label, meta: node.meta };
    const kids = node.children ? flattenTree(node.children, childPrefix, false) : [];
    return [row, ...kids];
  });
}
function asciiTree({ title, nodes }) {
  const rows = flattenTree(nodes);
  const left = colWidth(rows.map((row) => `${row.branch}${row.label}`));
  const hasMeta = rows.some((row) => row.meta);
  return frameAscii(
    title,
    rows.map((row) => {
      const name = `${row.branch}${row.label}`;
      if (!hasMeta) {
        return name;
      }
      return `${col(name, left)}  ${row.meta ?? ""}`;
    })
  );
}
function asciiGantt({
  title,
  items,
  ticks,
  columns = 24,
  progress
}) {
  const labels = colWidth(items.map((item) => item.label));
  const lines = [];
  if (progress != null) {
    const playhead = Math.round(clamp01(progress) * (columns - 1));
    const head = Array.from(
      { length: columns },
      (_, index) => index === playhead ? "\u25BE" : " "
    ).join("");
    lines.push(`${col("", labels)}  ${head}`);
  }
  for (const item of items) {
    const start = Math.round(clamp01(item.start) * columns);
    const end = Math.max(start + 1, Math.round(clamp01(item.end) * columns));
    const span = end - start;
    const done = Math.round(clamp01(item.complete ?? 1) * span);
    const bar = Array.from({ length: columns }, (_, index) => {
      const inBar = index >= start && index < end;
      const filled = inBar && index < start + done;
      const rest = inBar && !filled;
      if (filled) {
        return "\u2588";
      }
      if (rest) {
        return "\u2591";
      }
      return "-";
    }).join("");
    lines.push(`${col(item.label, labels)}  ${bar}`);
  }
  if (ticks && ticks.length > 0) {
    const track = columns;
    const placed = ticks.map((tick, index) => {
      const slot = ticks.length === 1 ? 0 : Math.round(index / (ticks.length - 1) * (track - tick.length));
      return { tick, slot: Math.max(0, Math.min(track - tick.length, slot)) };
    });
    const axis = Array.from({ length: track }, () => " ");
    for (const item of placed) {
      for (let index = 0; index < item.tick.length; index++) {
        axis[item.slot + index] = item.tick[index] ?? " ";
      }
    }
    lines.push(`${col("", labels)}  ${axis.join("")}`);
  }
  return frameAscii(title, lines);
}
function asciiInvoice({
  title,
  from,
  to,
  meta,
  items,
  totals,
  note
}) {
  const lines = [];
  if (from || to) {
    const fromLines = from ? ["FROM", from.name, ...from.lines ?? []] : [];
    const toLines = to ? ["BILL TO", to.name, ...to.lines ?? []] : [];
    const leftW = colWidth(fromLines);
    const height = Math.max(fromLines.length, toLines.length);
    for (let index = 0; index < height; index++) {
      lines.push(
        `${col(fromLines[index] ?? "", leftW)}    ${toLines[index] ?? ""}`
      );
    }
    lines.push("");
  }
  if (meta && meta.length > 0) {
    const labels = meta.map((entry) => entry.label);
    const values = meta.map((entry) => entry.value);
    const widths = meta.map(
      (entry, index) => Math.max(entry.label.length, values[index]?.length ?? 0)
    );
    lines.push(
      labels.map((label, index) => col(label, widths[index] ?? 0)).join("  ")
    );
    lines.push(
      values.map((value, index) => col(value, widths[index] ?? 0)).join("  ")
    );
    lines.push("");
  }
  const showQty = items.some((item) => item.qty != null);
  const showRate = items.some((item) => item.rate != null);
  const headers = [
    "Description",
    ...showQty ? ["Qty"] : [],
    ...showRate ? ["Rate"] : [],
    "Amount"
  ];
  const grid = gridLines({
    headers,
    rows: items.map((item) => [
      item.description,
      ...showQty ? [item.qty ?? ""] : [],
      ...showRate ? [item.rate ?? ""] : [],
      item.amount
    ])
  });
  lines.push(...grid.lines);
  if (totals && totals.length > 0) {
    const totalWidth = colWidth(totals.map((entry) => entry.label));
    const amountWidth = colWidth(totals.map((entry) => entry.value));
    const block = totals.map(
      (entry) => `${col(entry.label, totalWidth)}  ${col(entry.value, amountWidth, "right")}`
    );
    const span = grid.cells(headers).length;
    const indent = Math.max(0, span - (block[0]?.length ?? 0));
    lines.push(grid.ruleLine());
    for (const line of block) {
      lines.push(`${" ".repeat(indent)}${line}`);
    }
  }
  if (note) {
    lines.push("", note);
  }
  return frameAscii(title, lines);
}
function miniBars(values, height, fill = "\u2588") {
  const max = Math.max(...values, 1);
  const rows = [];
  for (let row = 0; row < height; row++) {
    const fromTop = row;
    const glyphs = values.map((value) => {
      const level = Math.round(value / max * (height - 1));
      const fromBottom = height - 1 - fromTop;
      return fromBottom <= level ? fill : " ";
    });
    rows.push(glyphs.join(" "));
  }
  return rows;
}
function asciiBars({
  title,
  from,
  to,
  processor
}) {
  const fromHeight = from.size === "lg" ? 8 : 5;
  const toHeight = to.size === "lg" ? 8 : 5;
  const left = miniBars(from.values, fromHeight);
  const right = miniBars(to.values, toHeight);
  const leftW = colWidth([...left, from.label]);
  const rightW = colWidth([...right, to.label]);
  const height = Math.max(fromHeight, toHeight);
  const arrow = processor ? `--> ${processor} -->` : "-->";
  const lines = [];
  for (let row = 0; row < height; row++) {
    const fromRow = left[row + (height - fromHeight)] ?? col("", leftW);
    const toRow = right[row + (height - toHeight)] ?? col("", rightW);
    const mid = row === height - 1 ? arrow : " ".repeat(arrow.length);
    lines.push(`${col(fromRow, leftW)}  ${mid}  ${col(toRow, rightW)}`);
  }
  lines.push(
    `${col(from.label, leftW)}  ${" ".repeat(arrow.length)}  ${col(to.label, rightW)}`
  );
  return frameAscii(title, lines);
}
var CALLOUT_GLYPH = {
  note: "i",
  tip: "+",
  warning: "!",
  danger: "\xD7"
};
function asciiCallout({
  type = "note",
  title,
  body
}) {
  const glyph = CALLOUT_GLYPH[type] ?? "i";
  const lines = body.split(/\n/).flatMap((line) => wrapText(line, 56));
  const drawn = lines.length === 0 ? [`${glyph}`] : lines.map(
    (line, index) => index === 0 ? `${glyph}  ${line}` : `   ${line}`
  );
  return frameAscii(title ?? type, drawn);
}
function asciiQuote({
  title,
  by,
  source,
  body
}) {
  const wrapped = wrapText(body.replace(/\s+/g, " ").trim(), 54);
  const lines = wrapped.length === 0 ? ["\u201C"] : wrapped.map(
    (line, index) => index === 0 ? `\u201C  ${line}` : `   ${line}`
  );
  if (by || source) {
    lines.push("");
    lines.push(`\u2014  ${[by, source].filter(Boolean).join("  ")}`);
  }
  return frameAscii(title, lines);
}
function asciiSteps({
  title,
  steps
}) {
  const lines = [];
  steps.forEach((step, index) => {
    const n = String(index + 1);
    const head = wrapText(step.title, 54);
    lines.push(`${n}  ${head[0] ?? ""}`);
    head.slice(1).forEach((line) => lines.push(`   ${line}`));
    if (step.body) {
      wrapText(step.body, 54).forEach((line) => lines.push(`   ${line}`));
    }
    if (index < steps.length - 1) {
      lines.push("\u2502");
    }
  });
  return frameAscii(title ?? "STEPS", lines);
}
function asciiTerminal({ title, lines }) {
  return frameAscii(title ?? "SHELL", lines.length > 0 ? lines : [""]);
}
function asciiChangelog({
  title,
  version,
  date,
  items
}) {
  const glyph = {
    add: "+",
    change: "~",
    fix: "*",
    remove: "-"
  };
  const label = {
    add: "added",
    change: "changed",
    fix: "fixed",
    remove: "removed"
  };
  const kinds = colWidth(items.map((item) => label[item.type] ?? item.type));
  const drawn = [];
  if (version || date) {
    drawn.push([version, date].filter(Boolean).join("  "));
    drawn.push("");
  }
  for (const item of items) {
    const mark = glyph[item.type] ?? "-";
    const kind = col(label[item.type] ?? item.type, kinds);
    const wrapped = wrapText(item.text, 48);
    drawn.push(`${mark}  ${kind}  ${wrapped[0] ?? ""}`);
    wrapped.slice(1).forEach((line) => drawn.push(`      ${" ".repeat(kinds)}${line}`));
  }
  return frameAscii(title ?? version ?? "CHANGELOG", drawn);
}
function asciiFlow({ title, rows }) {
  return frameAscii(title, rows.length > 0 ? rows : [""]);
}
function asciiBoard({
  title,
  columns
}) {
  const shaped = columns.map((column) => {
    const items = column.items.map(
      (item) => typeof item === "string" ? { label: item } : item
    );
    const head = `${column.title}  ${items.length}`;
    const lines2 = items.flatMap((item) => {
      const mark = item.state === "now" ? "\u25CF" : "-";
      const label = wrapText(item.label, 20);
      return [
        ...label.map(
          (line, index) => index === 0 ? `${mark} ${line}` : `  ${line}`
        ),
        ...item.note ? wrapText(item.note, 20).map((line) => `  ${line}`) : []
      ];
    });
    const width = Math.max(colWidth([head, ...lines2]), 12);
    return { head, lines: lines2, width };
  });
  const height = Math.max(0, ...shaped.map((column) => column.lines.length));
  const join = (cells) => cells.join(" | ");
  const lines = [
    join(shaped.map((column) => col(column.head, column.width))),
    join(shaped.map((column) => rule(column.width))),
    ...Array.from(
      { length: height },
      (_, row) => join(shaped.map((column) => col(column.lines[row] ?? "", column.width)))
    )
  ];
  return frameAscii(
    title,
    lines.map((line) => line.trimEnd())
  );
}
function asciiAnnotate({
  title,
  lines,
  notes
}) {
  const width = String(
    Math.max(1, notes.length, ...lines.map((line) => line.mark ?? 0))
  ).length;
  const tag = (index) => `[${String(index).padStart(width, " ")}]`;
  const blank = " ".repeat(width + 2);
  const drawn = lines.map(
    (line) => `${line.mark ? tag(line.mark) : blank}  ${line.text}`.trimEnd()
  );
  if (notes.length > 0) {
    drawn.push("");
    notes.forEach((note, index) => {
      wrapText(note, 52).forEach(
        (line, at) => drawn.push(`${at === 0 ? tag(index + 1) : blank}  ${line}`)
      );
    });
  }
  return frameAscii(title ?? "CODE", drawn);
}
function asciiDecision({
  title,
  status,
  date,
  options,
  body
}) {
  const glyph = {
    chosen: "\u25CF",
    open: "\u25CB",
    rejected: "\xD7"
  };
  const labels = colWidth(options.map((option) => option.label));
  const drawn = [];
  if (status || date) {
    drawn.push([status, date].filter(Boolean).join("  "), "");
  }
  for (const option of options) {
    const reason = option.reason ? `  ${option.reason}` : "";
    drawn.push(
      `${glyph[option.state ?? "open"] ?? "\u25CB"}  ${col(option.label, labels)}${reason}`.trimEnd()
    );
  }
  if (body) {
    drawn.push("");
    body.split(/\n+/).forEach((paragraph) => drawn.push(...wrapText(paragraph, 56)));
  }
  return frameAscii(title ?? "DECISION", drawn);
}
function asciiScore({
  title,
  items,
  max = 5
}) {
  const labels = colWidth(items.map((item) => item.label));
  const fmt = (value) => Number.isInteger(value) ? String(value) : value.toFixed(1);
  return frameAscii(
    title,
    items.map((item) => {
      const out = Math.max(1, Math.round(item.max ?? max));
      const value = Math.min(out, Math.max(0, item.value));
      const full = Math.floor(value);
      const half = value - full >= 0.5 ? 1 : 0;
      const dots = "\u25CF".repeat(full) + "\u25D0".repeat(half) + "\u25CB".repeat(out - full - half);
      return `${col(item.label, labels)}  ${dots}  ${fmt(value)}/${out}`;
    })
  );
}
function asciiChat({
  title,
  turns,
  you,
  prompt = ">"
}) {
  const asker = (you ?? turns[0]?.by ?? "").toLowerCase();
  const names = colWidth(turns.map((turn) => turn.by));
  const drawn = [];
  turns.forEach((turn, index) => {
    const same = index > 0 && turns[index - 1]?.by === turn.by;
    if (index > 0 && !same) {
      drawn.push("");
    }
    const mine = turn.by.toLowerCase() === asker;
    const mark = mine && !same ? prompt : " ".repeat(prompt.length);
    const name = same ? "" : turn.by;
    wrapText(turn.text, 44).forEach(
      (line, at) => drawn.push(
        at === 0 ? `${mark}  ${col(name, names)}  ${line}` : `${" ".repeat(prompt.length)}  ${" ".repeat(names)}  ${line}`
      )
    );
  });
  return frameAscii(title ?? "CHAT", drawn);
}
function asciiEnv({
  title,
  vars
}) {
  const names = colWidth(vars.map((entry) => entry.name));
  const drawn = [];
  const spaced = vars.some((entry) => entry.note);
  for (const [index, entry] of vars.entries()) {
    if (spaced && index > 0) {
      drawn.push("");
    }
    const mark = entry.required ? "*" : " ";
    drawn.push(`${mark}  ${col(entry.name, names)}  ${entry.value || "\u2014"}`);
    if (entry.note) {
      wrapText(entry.note, 52).forEach((line) => drawn.push(`   ${line}`));
    }
  }
  if (vars.some((entry) => entry.required)) {
    drawn.push("", "* required");
  }
  return frameAscii(title ?? ".ENV", drawn);
}
function asciiEndpoint({
  title,
  method,
  path,
  about,
  params,
  blocks
}) {
  const drawn = [`${method.toUpperCase()}  ${path}`];
  if (about) {
    drawn.push(...wrapText(about, 56));
  }
  if (params.length > 0) {
    const names = colWidth(params.map((param) => param.name));
    const types = colWidth(params.map((param) => param.type ?? ""));
    drawn.push("");
    for (const param of params) {
      const mark = param.required ? "*" : " ";
      drawn.push(
        `${mark}  ${col(param.name, names)}  ${col(param.type ?? "", types)}  ${param.description ?? ""}`.trimEnd()
      );
    }
  }
  for (const block of blocks) {
    drawn.push("");
    if (block.label) {
      drawn.push(block.label);
    }
    drawn.push(...block.code.split("\n"));
  }
  return frameAscii(title ?? "ENDPOINT", drawn);
}
function asciiKeys({
  title,
  bindings
}) {
  const MODS = /* @__PURE__ */ new Set(["\u2318", "\u2325", "\u21E7", "\u2303", "\u238B", "\u21B5", "\u232B", "\u21E5"]);
  const caps = bindings.map(
    (binding) => binding.keys.split(/\s+then\s+/i).map(
      (chord) => chord.split(/\s*\+\s*|\s+/).filter(Boolean).flatMap((token) => {
        const glyphs = [...token];
        const lead = glyphs.findIndex((glyph) => !MODS.has(glyph));
        if (lead <= 0) {
          return lead === -1 ? glyphs : [token];
        }
        return [...glyphs.slice(0, lead), glyphs.slice(lead).join("")];
      }).map((key) => `[${key}]`).join("")
    ).join(" then ")
  );
  const width = colWidth(caps);
  return frameAscii(
    title ?? "KEYS",
    bindings.map(
      (binding, index) => `${col(caps[index] ?? "", width)}  ${binding.action}`
    )
  );
}
function asciiFaq({
  title,
  entries
}) {
  const drawn = [];
  entries.forEach((entry, index) => {
    if (index > 0) {
      drawn.push("");
    }
    wrapText(entry.question, 54).forEach(
      (line, at) => drawn.push(`${at === 0 ? "?" : " "}  ${line}`)
    );
    if (entry.answer) {
      entry.answer.split(/\n+/).flatMap((paragraph) => wrapText(paragraph, 54)).forEach((line) => drawn.push(`   ${line}`));
    }
  });
  return frameAscii(title ?? "FAQ", drawn);
}

// ../knap/registry/default/graph-knap/markdown.ts
function unwrapFence(body) {
  return body.trim().replace(/^```(?:\w*)\n?/, "").replace(/\n?```$/, "").trim();
}
function marks(text) {
  const trimmed = text.trim();
  const strong = /(\*\*|__)(?=\S)[\s\S]*?\S\1/.test(trimmed);
  const em = !strong && /(^|[^\w*])([*_])(?=\S)[^*_]*?\S\2(?![\w*])/.test(trimmed);
  return {
    text: trimmed.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2").replace(/(^|[^\w*])([*_])(?=\S)([^*_]*?\S)\2(?![\w*])/g, "$1$3").trim(),
    strong,
    em
  };
}
function bullets(body) {
  const items = [];
  for (const line of body.split("\n")) {
    const match = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (!match) {
      continue;
    }
    items.push({ indent: (match[1] ?? "").length, ...marks(match[2] ?? "") });
  }
  return items;
}
function nest(items) {
  const root = [];
  const stack = [
    { indent: -1, children: root }
  ];
  for (const item of items) {
    while (stack.length > 1 && item.indent <= (stack.at(-1)?.indent ?? 0)) {
      stack.pop();
    }
    const [label, meta] = item.text.split(/\s+[—–]\s+/);
    const node = {
      label: label || item.text,
      meta,
      accent: item.strong,
      children: []
    };
    stack.at(-1)?.children.push(node);
    stack.push({ indent: item.indent, children: node.children ?? [] });
  }
  const clean = (nodes) => nodes.map((node) => ({
    ...node,
    children: node.children && node.children.length > 0 ? clean(node.children) : void 0
  }));
  return clean(root);
}
function splitLabel(text) {
  const match = text.match(/^(.+?):\s+(.+)$/);
  if (!match) {
    return { label: text, rest: "" };
  }
  return { label: (match[1] ?? text).trim(), rest: (match[2] ?? "").trim() };
}
function firstToken(text) {
  const match = text.match(/^(\S+)\s*(.*)$/);
  return { token: match?.[1] ?? text, rest: match?.[2] ?? "" };
}
function runs(value) {
  return (value ?? "").split(/[\s,]+/).filter(Boolean).flatMap((token) => {
    const match = token.match(/^(.+?)[*×](\d{1,4})$/);
    return match ? Array.from(
      { length: Math.min(5e3, Number(match[2])) },
      () => match[1] ?? token
    ) : [token];
  });
}
function numbers(value) {
  return runs(value).map(Number).filter((entry) => Number.isFinite(entry));
}
function plain(text) {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|\*|~~|`)/g, "").replace(/\s+/g, " ").trim();
}
function splitDash(text) {
  const parts = text.split(/\s+[—–]\s+/);
  return {
    label: (parts[0] ?? text).trim(),
    rest: parts.slice(1).join(" \u2014 ").trim()
  };
}
function listBlocks(body) {
  const out = [];
  let open = false;
  for (const line of body.split("\n")) {
    const match = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (match) {
      out.push({
        indent: (match[1] ?? "").length,
        ordered: /\d/.test(match[2] ?? ""),
        body: [],
        ...marks(match[3] ?? "")
      });
      open = true;
      continue;
    }
    if (!line.trim()) {
      continue;
    }
    if (/^\s+/.test(line) && open) {
      out.at(-1)?.body.push(line.trim());
      continue;
    }
    open = false;
  }
  return out;
}
function paragraphs(body) {
  return body.replace(/```[\s\S]*?```/g, "").split(/\n\s*\n/).map((block) => block.trim()).filter(
    (block) => block && !/^([-*+]|\d+[.)])\s/.test(block) && !block.startsWith("#") && !block.startsWith("|")
  ).map((block) => plain(block));
}
function fences(body) {
  return [...body.matchAll(/```([\w-]*)[^\n]*\n([\s\S]*?)\n?```/g)].map(
    (match) => ({ language: match[1] || void 0, code: match[2] ?? "" })
  );
}
function sections(body) {
  const out = [];
  for (const line of body.split("\n")) {
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      out.push({ title: heading[1] ?? "", lines: [] });
      continue;
    }
    out.at(-1)?.lines.push(line);
  }
  return out;
}
function envVars(source) {
  const vars = [];
  let notes = [];
  const required = /\(?\brequired\b\)?[.:]?/i;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) {
      notes = [];
      continue;
    }
    if (line.startsWith("#")) {
      notes.push(line.replace(/^#+\s*/, ""));
      continue;
    }
    const match = line.match(/^(?:export\s+)?([A-Za-z_][\w.]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    const [value = "", inline = ""] = (match[2] ?? "").split(/\s+#\s*/);
    const all = [...notes, inline].filter(Boolean);
    vars.push({
      name: match[1] ?? "",
      value: value.trim().replace(/^(['"])([\s\S]*)\1$/, "$2"),
      note: all.map((note) => note.replace(required, "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" ") || void 0,
      required: all.some((note) => required.test(note))
    });
    notes = [];
  }
  return vars;
}
function fraction(value, fallback = 0) {
  if (!value) {
    return fallback;
  }
  const text = value.trim();
  const percent = text.endsWith("%");
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return percent ? parsed / 100 : parsed;
}
function isSeparator(line) {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line);
}
function splitRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}
function parseGfm(body) {
  const rows = body.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("|"));
  if (rows.length < 2) {
    return null;
  }
  const sep = rows.find(isSeparator);
  const data = rows.filter((row) => !isSeparator(row)).map(splitRow);
  const headers = data[0];
  if (!headers) {
    return null;
  }
  const align = sep ? splitRow(sep).map(
    (cell) => cell.endsWith(":") && !cell.startsWith(":") ? "right" : "left"
  ) : void 0;
  const rest = data.slice(1);
  const last = rest.at(-1);
  const footer = last && rest.length > 1 && (/^total$/i.test(last[0] ?? "") || /^\*\*.+\*\*$/.test(last[0] ?? "")) ? rest.pop()?.map((cell) => cell.replace(/^\*\*(.+)\*\*$/, "$1")) : void 0;
  return { headers, rows: rest, footer, align };
}
function parseLabeled(body) {
  const table = parseGfm(body);
  if (!table || table.headers.length < 2) {
    return null;
  }
  const labeled = table.headers[0] === "" || table.headers[0] === "\u2014" || table.headers[0] === "-";
  const columns = labeled ? table.headers.slice(1) : table.headers;
  const rows = table.rows.map((row) => ({
    label: labeled ? row[0] ?? "" : row[0] ?? "",
    values: labeled ? row.slice(1) : row.slice(1)
  }));
  if (!labeled) {
    return {
      columns: table.headers,
      rows: table.rows.map((row) => ({
        label: row[0] ?? "",
        values: row.slice(1)
      }))
    };
  }
  return { columns, rows };
}
function parseOrdered(body) {
  const chunks = body.trim().split(/\n(?=\s*\d+\.\s+)/);
  return chunks.flatMap((chunk) => {
    const match = chunk.match(/^\s*\d+\.\s+([\s\S]*)$/);
    if (!match) {
      return [];
    }
    const lines = (match[1] ?? "").split("\n");
    const head = marks((lines[0] ?? "").trim());
    const rest = lines.slice(1).map((line) => line.trim()).filter(Boolean).join(" ");
    return [{ title: head.text, body: rest || void 0 }];
  });
}
function compareCell(value) {
  const key = value.trim().toLowerCase();
  if (key === "yes" || key === "true") {
    return true;
  }
  if (key === "no" || key === "false") {
    return false;
  }
  return value;
}
function series(body) {
  const listed = bullets(body);
  if (listed.length > 0) {
    return {
      data: listed.map((item) => {
        const { label: label2, rest: rest2 } = splitLabel(plain(item.text));
        return Number.parseFloat((rest2 || label2).replace(/,/g, ""));
      }).filter((value) => Number.isFinite(value)),
      caption: void 0
    };
  }
  const { label, rest } = splitDash(body.replace(/\s+/g, " ").trim());
  return { data: numbers(label), caption: rest || void 0 };
}
function checkTree(body) {
  const root = [];
  const stack = [
    { indent: -1, items: root }
  ];
  for (const item of bullets(body)) {
    while (stack.length > 1 && item.indent <= (stack.at(-1)?.indent ?? 0)) {
      stack.pop();
    }
    const done = /^\[[xX]\]/.test(item.text);
    const rest = item.text.replace(/^\[[ xX]\]\s*/, "");
    const { label, rest: note } = splitDash(rest);
    const node = {
      label: label || rest,
      done,
      note: note || void 0,
      items: []
    };
    stack.at(-1)?.items.push(node);
    stack.push({ indent: item.indent, items: node.items ?? [] });
  }
  const clean = (nodes) => nodes.map((node) => ({
    ...node,
    items: node.items?.length ? clean(node.items) : void 0
  }));
  return clean(root);
}
function drawMarkdown(name, props, body, title = props.title) {
  switch (name) {
    case "Callout":
      return asciiCallout({
        type: props.type,
        title: title ?? props.type,
        body
      });
    case "Quote":
      return asciiQuote({
        title,
        by: props.by,
        source: props.source,
        body
      });
    case "Steps":
      return asciiSteps({ title, steps: parseOrdered(body) });
    case "Terminal":
      return asciiTerminal({
        title: title ?? "SHELL",
        lines: unwrapFence(body).split("\n")
      });
    case "Changelog": {
      const items = bullets(body).map((item) => {
        const { label, rest } = splitLabel(item.text);
        const type = label === "added" ? "add" : label === "changed" ? "change" : label === "fixed" ? "fix" : label === "removed" ? "remove" : "change";
        return { type, text: rest || item.text };
      });
      return asciiChangelog({
        title,
        version: props.version,
        date: props.date,
        items
      });
    }
    case "GraphTable": {
      const table = parseGfm(body);
      return asciiTable({
        title: title ?? "TABLE",
        headers: table?.headers ?? [],
        rows: table?.rows ?? [],
        footer: table?.footer,
        align: table?.align
      });
    }
    case "GraphSheet": {
      const sections2 = [];
      let current = null;
      let headers = [];
      for (const line of body.split("\n")) {
        const heading = line.match(/^#{1,6}\s+(.*)$/);
        if (heading) {
          current = { title: heading[1] ?? "", rows: [] };
          sections2.push(current);
          continue;
        }
        if (!line.trim().startsWith("|") || isSeparator(line)) {
          continue;
        }
        const cells = splitRow(line);
        if (!current) {
          continue;
        }
        if (headers.length === 0) {
          headers = cells;
          continue;
        }
        if (cells[0] && cells[0] === headers[0]) {
          continue;
        }
        current.rows.push(cells);
      }
      return asciiSheet({
        title: title ?? "SHEET",
        headers: headers.length > 0 ? headers : ["Item"],
        sections: sections2
      });
    }
    case "GraphTree":
      return asciiTree({
        title: title ?? "TREE",
        nodes: nest(bullets(body))
      });
    case "GraphTimeline":
      return asciiTimeline({
        title: title ?? "TIMELINE",
        events: listBlocks(body).map((item) => {
          const { label, rest } = splitLabel(item.text);
          const { label: what, rest: aside } = splitDash(rest || label);
          return {
            date: rest ? label : item.text,
            label: what,
            note: item.body.length > 0 ? plain(item.body.join(" ")) : aside || void 0,
            state: item.strong ? "now" : item.em ? "next" : "done"
          };
        })
      });
    case "GraphCheck":
      return asciiCheck({
        title: title ?? "CHECK",
        items: checkTree(body)
      });
    case "GraphFlow":
      return asciiFlow({
        title: title ?? "FLOW",
        rows: body.split(/\n+/).map((line) => line.replace(/\*+/g, "").trim()).filter(Boolean)
      });
    case "GraphBars": {
      const series2 = bullets(body).map((item) => {
        const { label, rest } = splitLabel(item.text);
        return {
          label: rest ? label : item.text,
          values: numbers(rest),
          size: item.strong ? "lg" : "sm"
        };
      });
      return asciiBars({
        title: title ?? "BARS",
        from: series2[0] ?? { label: "from", values: [] },
        to: series2[1] ?? { label: "to", values: [] },
        processor: props.processor
      });
    }
    case "GraphRank":
      return asciiRank({
        title: title ?? "RANK",
        items: bullets(body).map((item) => {
          const { token, rest } = firstToken(item.text);
          return { label: rest || token, value: Number.parseFloat(token) || 0 };
        }),
        max: props.max ? Number(props.max) : void 0
      });
    case "GraphCells":
      return asciiCells({
        title: title ?? "CELLS",
        items: bullets(body).map((item) => {
          const { label, rest } = splitLabel(item.text);
          const cells = (rest || item.text).split("/").map(
            (row) => row.trim().split(/\s+/).map((cell) => Number.parseInt(cell, 10) || 0)
          );
          return { label: rest ? label : item.text, cells };
        })
      });
    case "GraphMeter": {
      const written = firstToken(plain(body));
      return asciiMeter({
        title: title ?? "METER",
        value: fraction(props.value ?? written.token),
        ticks: props.ticks ? Number(props.ticks) : 14,
        caption: props.caption ?? (props.value ? void 0 : written.rest.replace(/^[—–-]\s*/, "") || void 0)
      });
    }
    case "GraphSpark": {
      const written = series(body);
      return asciiSpark({
        title: title ?? "SPARK",
        data: props.data ? numbers(props.data) : written.data,
        caption: props.caption ?? written.caption
      });
    }
    case "GraphStack":
      return asciiStack({
        title: title ?? "STACK",
        rows: bullets(body).map((item) => {
          const { label, rest } = splitLabel(item.text);
          const segs = (rest || item.text).split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
            const { token, rest: name2 } = firstToken(part);
            return {
              label: name2 || token,
              value: Number.parseFloat(token) || 0
            };
          });
          return { label: rest ? label : item.text, segments: segs };
        }),
        ticks: props.ticks ? Number(props.ticks) : void 0
      });
    case "GraphFunnel":
      return asciiFunnel({
        title: title ?? "FUNNEL",
        steps: bullets(body).map((item) => {
          const { token, rest } = firstToken(item.text);
          return {
            value: Number.parseFloat(token.replace(/,/g, "")) || 0,
            label: rest || token
          };
        })
      });
    case "GraphGantt":
      return asciiGantt({
        title: title ?? "GANTT",
        columns: props.columns ? Number(props.columns) : 24,
        ticks: props.ticks ? props.ticks.split(/\s+/) : void 0,
        items: bullets(body).map((item) => {
          const { label, rest } = splitLabel(item.text);
          const nums = (rest || item.text).match(/[\d.]+/g) ?? [];
          return {
            label: rest ? label : item.text.replace(/[\d.]+/g, "").trim(),
            start: Number(nums[0] ?? 0),
            end: Number(nums[1] ?? nums[0] ?? 0),
            complete: nums[2] != null ? Number(nums[2]) : void 0
          };
        })
      });
    case "GraphDiff":
      return asciiDiff({
        title: title ?? "DIFF",
        rows: bullets(body).flatMap((item) => {
          const strike = item.text.match(/^(.*?)~~(.+?)~~(.*)$/);
          if (strike) {
            const before = plain(strike[1] ?? "");
            const join = (text) => plain(`${before} ${text}`);
            return [
              {
                label: join(strike[2] ?? ""),
                value: "",
                sign: "remove"
              },
              ...plain(strike[3] ?? "") ? [
                {
                  label: join(strike[3] ?? ""),
                  value: "",
                  sign: "add"
                }
              ] : []
            ];
          }
          const { label, rest } = splitLabel(item.text);
          const sign = /^\+/.test(rest) ? "add" : /^[−\-]/.test(rest) ? "remove" : void 0;
          return [
            {
              label: rest ? label : item.text,
              value: rest.replace(/^[+\-−]\s*/, "") || rest,
              sign
            }
          ];
        })
      });
    case "GraphInvoice": {
      const table = parseGfm(body);
      const meta = bullets(body).map((item) => splitLabel(item.text)).filter((item) => item.rest).map((item) => ({ label: item.label, value: item.rest }));
      const totals = body.split("\n").flatMap((line) => {
        const match = line.trim().match(/^\*\*(.+?)\*\*\s+([\d,]+(?:\.\d+)?)\s*$/);
        if (!match) {
          return [];
        }
        return [{ label: match[1] ?? "", value: match[2] ?? "" }];
      });
      const note = body.split(/\n\s*\n/).map((block) => block.trim()).find(
        (block) => block && !block.startsWith("|") && !block.startsWith("-") && !block.startsWith("**")
      );
      const headers = table?.headers.map((header) => header.toLowerCase()) ?? [];
      const qtyAt = headers.findIndex((header) => /qty|quantity/.test(header));
      const rateAt = headers.findIndex((header) => /rate|price/.test(header));
      const amountAt = headers.findIndex(
        (header) => /amount|total|sum/.test(header)
      );
      return asciiInvoice({
        title: title ?? "INVOICE",
        from: props.from ? { name: props.from } : void 0,
        to: props.to ? { name: props.to } : void 0,
        meta,
        items: (table?.rows ?? []).map((row) => {
          const last = row.length - 1;
          return {
            description: row[0] ?? "",
            qty: qtyAt >= 0 ? row[qtyAt] : row.length >= 4 ? row[1] : void 0,
            rate: rateAt >= 0 ? row[rateAt] : row.length >= 4 ? row[2] : void 0,
            amount: row[amountAt >= 0 ? amountAt : last] ?? ""
          };
        }),
        totals,
        note
      });
    }
    case "GraphCompare": {
      const labeled = parseLabeled(body);
      return asciiCompare({
        title: title ?? "COMPARE",
        columns: labeled?.columns ?? props.columns?.split(/\s+/) ?? [],
        rows: (labeled?.rows ?? []).map((row) => ({
          label: row.label,
          values: row.values.map(compareCell)
        }))
      });
    }
    case "GraphMatrix":
    case "GraphHeatmap": {
      const labeled = parseLabeled(body);
      return asciiMatrix({
        title: title ?? name.replace("Graph", "").toUpperCase(),
        columns: labeled?.columns ?? [],
        rows: (labeled?.rows ?? []).map((row) => ({
          label: row.label,
          values: row.values.map((value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : value;
          })
        }))
      });
    }
    case "GraphStat":
      return asciiStat({
        title: title ?? "STAT",
        items: bullets(body).map((item) => {
          const { token, rest } = firstToken(item.text);
          const [label, hint] = rest.split(/\s+[—–]\s+/);
          return { value: token, label: label || rest, hint };
        })
      });
    case "GraphKpi": {
      const [head = "", ...tail] = body.split("\n").map((line) => plain(line)).filter(Boolean);
      const { token, rest } = firstToken(head);
      const written = splitDash(rest);
      return asciiKpi({
        title: title ?? "KPI",
        value: props.value ?? token,
        label: props.label ?? written.label,
        hint: props.hint ?? (written.rest || void 0),
        data: numbers(props.data ?? tail.join(" "))
      });
    }
    case "GraphSpec":
      return asciiSpec({
        title: title ?? "SPEC",
        rows: listBlocks(body).map((item) => {
          const { label, rest } = splitLabel(plain(item.text));
          return {
            label: rest ? label : item.text,
            value: rest,
            note: item.body.length > 0 ? plain(item.body.join(" ")) : void 0
          };
        })
      });
    case "GraphWaterfall":
      return asciiWaterfall({
        title: title ?? "WATERFALL",
        items: bullets(body).map((item) => {
          const { label, rest } = splitLabel(item.text);
          return {
            label: rest ? label : item.text.replace(/[+\-−\d.,]+/g, "").trim(),
            value: Number.parseFloat((rest || item.text).replace(/[^\d.+-]/g, "")) || 0
          };
        })
      });
    case "GraphUptime":
      return asciiUptime({
        title: title ?? "UPTIME",
        from: props.from,
        to: props.to,
        days: runs(props.days ?? body.replace(/\\\*/g, "*")).filter(
          (day) => ["ok", "degraded", "down", "empty"].includes(day)
        )
      });
    case "GraphSlope":
      return asciiSlope({
        title: title ?? "SLOPE",
        fromLabel: props.fromLabel ?? "",
        toLabel: props.toLabel ?? "",
        items: bullets(body).map((item) => {
          const { label, rest } = splitLabel(item.text);
          const [from, to] = rest.split(/\s*(?:→|->)\s*/);
          return {
            label: rest ? label : item.text,
            from: Number(from) || 0,
            to: Number(to) || 0
          };
        })
      });
    case "GraphBullet":
      return asciiBullet({
        title: title ?? "BULLET",
        items: bullets(body).map((item) => {
          const { label, rest } = splitLabel(item.text);
          const nums = (rest || item.text).match(/[\d.]+/g) ?? [];
          return {
            label: rest ? label : item.text,
            value: Number(nums[0] ?? 0),
            target: nums[1] != null ? Number(nums[1]) : void 0,
            max: nums[2] != null ? Number(nums[2]) : void 0
          };
        })
      });
    case "GraphWaffle": {
      const written = firstToken(plain(body));
      return asciiWaffle({
        title: title ?? "WAFFLE",
        value: fraction(props.value ?? written.token),
        caption: props.caption ?? (props.value ? void 0 : written.rest.replace(/^[—–-]\s*/, "") || void 0)
      });
    }
    case "GraphPlot": {
      const written = series(body);
      return asciiSpark({
        title: title ?? "PLOT",
        data: props.data ? numbers(props.data) : written.data,
        caption: props.caption ?? written.caption
      });
    }
    case "GraphBoard":
      return asciiBoard({
        title: title ?? "BOARD",
        columns: sections(body).map((section) => ({
          title: plain(section.title),
          items: bullets(section.lines.join("\n")).map((item) => {
            const { label, rest } = splitDash(plain(item.text));
            return {
              label,
              note: rest || void 0,
              state: item.strong ? "now" : item.em ? "next" : "done"
            };
          })
        }))
      });
    case "Annotate": {
      const fence2 = fences(body)[0];
      const marker = /\s*(?:\/\/|#|--|;|%|\/\*|<!--|\{\/\*)\s*\((\d{1,2})\)\s*(?:\*\/\}|\*\/|-->)?\s*$/;
      const outside = body.replace(/```[\s\S]*?```/g, "");
      return asciiAnnotate({
        title: title ?? fence2?.language ?? "code",
        lines: (fence2?.code ?? "").split("\n").map((line) => {
          const match = line.match(marker);
          return match && match.index != null ? { text: line.slice(0, match.index), mark: Number(match[1]) } : { text: line };
        }),
        notes: listBlocks(outside).filter((item) => item.indent === 0).map((item) => plain([item.text, ...item.body].join(" ")))
      });
    }
    case "Decision":
      return asciiDecision({
        title: title ?? "decision",
        status: props.status,
        date: props.date,
        options: bullets(body).map((item) => {
          const { label, rest } = splitDash(plain(item.text));
          return {
            label,
            reason: rest || void 0,
            state: item.strong ? "chosen" : item.em ? "rejected" : "open"
          };
        }),
        body: paragraphs(body).join("\n") || void 0
      });
    case "GraphScore":
      return asciiScore({
        title: title ?? "SCORE",
        max: props.max ? Number(props.max) : void 0,
        items: bullets(body).map((item) => {
          const { label, rest } = splitLabel(plain(item.text));
          const [value = "", out] = rest.split("/");
          return {
            label,
            value: Number.parseFloat(value) || 0,
            max: out ? Number.parseFloat(out) : void 0
          };
        })
      });
    case "Chat":
      return asciiChat({
        title: title ?? "chat",
        you: props.you,
        prompt: props.prompt,
        turns: listBlocks(body).flatMap((item) => {
          const { label, rest } = splitLabel(plain(item.text));
          return rest ? [{ by: label, text: plain([rest, ...item.body].join(" ")) }] : [];
        })
      });
    case "Env": {
      const fence2 = fences(body)[0];
      const listed = bullets(body);
      return asciiEnv({
        title: title ?? ".env",
        vars: fence2 ? envVars(fence2.code) : listed.length > 0 ? listed.map((item) => {
          const { label, rest } = splitLabel(plain(item.text));
          const { label: value, rest: note } = splitDash(rest);
          return {
            name: label,
            value,
            note: note || void 0,
            required: /^\*\*/.test(item.text) || item.strong
          };
        }) : envVars(body)
      });
    }
    case "Endpoint": {
      const route = /^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|QUERY)\s+(\S+)\s*$/i;
      const blocks = paragraphs(body);
      const hit = blocks.map((block) => block.match(route)).find(Boolean);
      const table = parseGfm(body);
      return asciiEndpoint({
        title: title ?? "endpoint",
        method: props.method ?? hit?.[1] ?? "GET",
        path: props.path ?? hit?.[2] ?? "/",
        about: blocks.filter((block) => !route.test(block)).join(" ") || void 0,
        params: (table?.rows ?? []).map((row) => ({
          name: plain(row[0] ?? ""),
          type: plain(row[1] ?? "") || void 0,
          description: plain(row[2] ?? "") || void 0,
          required: /^\*\*/.test(row[0] ?? "")
        })),
        blocks: fences(body).map((fence2) => ({
          label: /^\s*(\$ |curl\b)/.test(fence2.code) ? "request" : fence2.language,
          code: fence2.code
        }))
      });
    }
    case "Keys":
      return asciiKeys({
        title: title ?? "keys",
        bindings: bullets(body).map((item) => {
          const { label, rest } = splitLabel(plain(item.text));
          return { keys: label, action: rest };
        })
      });
    case "Faq":
      return asciiFaq({
        title: title ?? "faq",
        entries: sections(body).map((section) => ({
          question: plain(section.title),
          answer: paragraphs(section.lines.join("\n")).join("\n") || void 0
        }))
      });
    case "Graph":
      return asciiFlow({
        title: title ?? "",
        rows: body.replace(/<\/?GraphBody>/g, "").replace(/<\/?p>/g, "").split(/\n+/).map((line) => line.trim()).filter(Boolean)
      });
    default:
      return asciiFlow({
        title: title ?? name,
        rows: body ? body.split(/\n/).map((line) => line.replace(/\*+/g, "").trim()).filter(Boolean) : Object.entries(props).filter(([key, value]) => value && key !== "title").map(([key, value]) => `${key}: ${value}`)
      });
  }
}

// ../knap/registry/default/graph-knap/props.ts
var CONTENT_SLUGS = [
  "callout",
  "quote",
  "steps",
  "terminal",
  "changelog",
  "annotate",
  "decision",
  "chat",
  "env",
  "endpoint",
  "keys",
  "faq"
];
var GRAPH_VALUE_KEY = {
  callout: "body",
  quote: "body",
  steps: "body",
  terminal: "body",
  changelog: "body",
  annotate: "body",
  decision: "body",
  chat: "body",
  env: "body",
  endpoint: "body",
  keys: "body",
  faq: "body",
  "graph-table": "rows",
  "graph-sheet": "sections",
  "graph-invoice": "items",
  "graph-spec": "rows",
  "graph-diff": "rows",
  "graph-stat": "items",
  "graph-spark": "data",
  "graph-plot": "data",
  "graph-cells": "items",
  "graph-meter": "value",
  "graph-waffle": "value",
  "graph-stack": "rows",
  "graph-funnel": "steps",
  "graph-waterfall": "items",
  "graph-rank": "items",
  "graph-bullet": "items",
  "graph-heatmap": "rows",
  "graph-activity": "days",
  "graph-uptime": "days",
  "graph-flow": "rows",
  "graph-tree": "nodes",
  "graph-timeline": "events",
  "graph-gantt": "items",
  "graph-check": "items",
  "graph-board": "columns",
  "graph-score": "items",
  "graph-timer": "at",
  "graph-countdown": "to"
};
function filterName(slug) {
  const name = slug.replaceAll("-", "_");
  return name.startsWith("graph_") ? name : `graph_${name}`;
}
function isContent(slug) {
  return CONTENT_SLUGS.includes(slug);
}
function unquoteParam(param) {
  if (!param) return "";
  return param.replace(/^(['"])([\s\S]*)\1$/, "$2").trim();
}
function typedValue(value, context) {
  if (context && "rawValue" in context && context.rawValue !== void 0) {
    return context.rawValue;
  }
  if (!value || value === "undefined" || value === "null") return void 0;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cellText2(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}
function tableFromRecords(rows) {
  const first = rows[0];
  if (!first) return null;
  const headers = Object.keys(first);
  return {
    headers,
    rows: rows.map((row) => headers.map((header) => cellText2(row[header])))
  };
}
function defaultTitle(slug) {
  if (isContent(slug)) return void 0;
  return slug.replace(/^graph-/, "").replaceAll("-", " ").toUpperCase();
}
function resolveGraphProps(slug, value, param, context) {
  const token = unquoteParam(param);
  const format = token === "comark" ? "comark" : "ascii";
  const title = token && token !== "comark" ? token : void 0;
  const data = typedValue(value, context);
  if (data === void 0) return null;
  if (isPlainObject(data)) {
    const props = { ...data };
    if (title) props.title = title;
    if (props.title == null && defaultTitle(slug)) {
      props.title = defaultTitle(slug);
    }
    return { props, format };
  }
  if (slug === "graph-table" && Array.isArray(data) && data.length > 0 && isPlainObject(data[0])) {
    const table = tableFromRecords(data);
    if (!table) return null;
    return {
      props: {
        title: title ?? defaultTitle(slug),
        ...table
      },
      format
    };
  }
  const key = GRAPH_VALUE_KEY[slug];
  if (!key) return null;
  const fallback = title ?? defaultTitle(slug);
  return {
    props: {
      ...fallback ? { title: fallback } : {},
      [key]: data
    },
    format
  };
}
function warnFilter(context, message, code = "FILTER_WARNING") {
  context?.reportWarning?.({ message, code });
}

// ../knap/registry/default/graph-knap/yaml.ts
function isPlainObject2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isScalar(value) {
  return value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function yamlString(value) {
  if (value === "") return '""';
  if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(value)) return value;
  return JSON.stringify(value);
}
function yamlScalar(value) {
  if (value == null) return "null";
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") return yamlString(value);
  return JSON.stringify(value);
}
function flowMap(value) {
  const parts = Object.entries(value).filter(([, item]) => item !== void 0).map(([key, item]) => `${key}: ${yamlScalar(item)}`);
  return `{ ${parts.join(", ")} }`;
}
function yamlValue(value, indent) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every(isScalar)) {
      return `[${value.map((item) => yamlScalar(item)).join(", ")}]`;
    }
    if (value.every(
      (item) => isPlainObject2(item) && Object.values(item).every(isScalar)
    )) {
      return value.map((item) => `
${pad}- ${flowMap(item)}`).join("");
    }
    return value.map((item) => {
      if (isPlainObject2(item)) {
        const nested = yamlObject(item, indent + 2);
        const lines = nested.split("\n");
        const first = lines[0]?.trimStart() ?? "";
        const rest = lines.slice(1).join("\n");
        return `
${pad}- ${first}${rest ? `
${rest}` : ""}`;
      }
      return `
${pad}- ${yamlScalar(item)}`;
    }).join("");
  }
  if (isPlainObject2(value)) {
    return yamlObject(value, indent);
  }
  return yamlScalar(value);
}
function yamlObject(value, indent) {
  const pad = " ".repeat(indent);
  const lines = [];
  for (const [key, item] of Object.entries(value)) {
    if (item === void 0) continue;
    const rendered = yamlValue(item, indent + 2);
    if (rendered.startsWith("\n")) {
      lines.push(`${pad}${key}:${rendered}`);
    } else {
      lines.push(`${pad}${key}: ${rendered}`);
    }
  }
  return lines.join("\n");
}
function toYaml(value) {
  return yamlObject(value, 0);
}
function toComarkBlock(tag, props) {
  const { body, ...rest } = props;
  const yaml = toYaml(rest).trimEnd();
  const text = typeof body === "string" && body.trim() ? `${body.trim()}
` : "";
  if (!yaml) {
    return `::${tag}
${text}::`;
  }
  return `::${tag}
---
${yaml}
---
${text}::`;
}

// ../knap/registry/default/graph-knap/filters.ts
function fromBody(tag) {
  return (props) => {
    const attrs = {};
    for (const [key, value] of Object.entries(props)) {
      if (key === "body" || value == null) continue;
      attrs[key] = typeof value === "string" ? value : String(value);
    }
    const body = typeof props.body === "string" ? props.body : "";
    return drawMarkdown(tag, attrs, body);
  };
}
var ASCII = {
  callout: fromBody("Callout"),
  quote: fromBody("Quote"),
  steps: fromBody("Steps"),
  terminal: fromBody("Terminal"),
  changelog: fromBody("Changelog"),
  annotate: fromBody("Annotate"),
  decision: fromBody("Decision"),
  chat: fromBody("Chat"),
  env: fromBody("Env"),
  endpoint: fromBody("Endpoint"),
  keys: fromBody("Keys"),
  faq: fromBody("Faq"),
  "graph-board": asciiBoard,
  "graph-score": asciiScore,
  "graph-table": asciiTable,
  "graph-sheet": asciiSheet,
  "graph-bars": asciiBars,
  "graph-rank": asciiRank,
  "graph-cells": asciiCells,
  "graph-meter": asciiMeter,
  "graph-spark": asciiSpark,
  "graph-tree": asciiTree,
  "graph-timeline": asciiTimeline,
  "graph-check": asciiCheck,
  "graph-stack": asciiStack,
  "graph-funnel": asciiFunnel,
  "graph-gantt": asciiGantt,
  "graph-waffle": asciiWaffle,
  "graph-diff": asciiDiff,
  "graph-invoice": asciiInvoice,
  "graph-compare": asciiCompare,
  "graph-matrix": asciiMatrix,
  "graph-stat": asciiStat,
  "graph-kpi": asciiKpi,
  "graph-spec": asciiSpec,
  "graph-waterfall": asciiWaterfall,
  "graph-uptime": asciiUptime,
  "graph-slope": asciiSlope,
  "graph-bullet": asciiBullet
};
var GRAPH_FILTER_SLUGS = [
  "callout",
  "quote",
  "steps",
  "terminal",
  "changelog",
  "annotate",
  "decision",
  "chat",
  "env",
  "endpoint",
  "keys",
  "faq",
  "graph-table",
  "graph-sheet",
  "graph-invoice",
  "graph-spec",
  "graph-matrix",
  "graph-compare",
  "graph-diff",
  "graph-stat",
  "graph-kpi",
  "graph-spark",
  "graph-plot",
  "graph-bars",
  "graph-slope",
  "graph-cells",
  "graph-meter",
  "graph-waffle",
  "graph-stack",
  "graph-funnel",
  "graph-waterfall",
  "graph-rank",
  "graph-bullet",
  "graph-heatmap",
  "graph-activity",
  "graph-calendar",
  "graph-uptime",
  "graph-flow",
  "graph-tree",
  "graph-timeline",
  "graph-gantt",
  "graph-check",
  "graph-board",
  "graph-score",
  "graph-timer",
  "graph-countdown"
];
function applyGraphFilter(slug, value, param, context) {
  const resolved = resolveGraphProps(slug, value, param, context);
  if (!resolved) {
    warnFilter(
      context,
      `Could not read ${filterName(slug)} data`,
      "INVALID_FILTER_INPUT"
    );
    return value;
  }
  const ascii = ASCII[slug];
  const useComark = resolved.format === "comark" || !ascii;
  if (useComark) {
    return toComarkBlock(slug, resolved.props);
  }
  try {
    return fence(ascii(resolved.props));
  } catch {
    warnFilter(context, `Could not draw ${filterName(slug)}`);
    return value;
  }
}
function makeFilter(slug) {
  const name = filterName(slug);
  const filter = (value, param, context) => applyGraphFilter(slug, value, param, context);
  filter.metadata = {
    example: ASCII[slug] ? `${name}:"TITLE"` : `${name}:"comark"`
  };
  return filter;
}
var graphFilters = {
  graph_callout: makeFilter("callout"),
  graph_quote: makeFilter("quote"),
  graph_steps: makeFilter("steps"),
  graph_terminal: makeFilter("terminal"),
  graph_changelog: makeFilter("changelog"),
  graph_annotate: makeFilter("annotate"),
  graph_decision: makeFilter("decision"),
  graph_chat: makeFilter("chat"),
  graph_env: makeFilter("env"),
  graph_endpoint: makeFilter("endpoint"),
  graph_keys: makeFilter("keys"),
  graph_faq: makeFilter("faq"),
  graph_table: makeFilter("graph-table"),
  graph_sheet: makeFilter("graph-sheet"),
  graph_invoice: makeFilter("graph-invoice"),
  graph_spec: makeFilter("graph-spec"),
  graph_matrix: makeFilter("graph-matrix"),
  graph_compare: makeFilter("graph-compare"),
  graph_diff: makeFilter("graph-diff"),
  graph_stat: makeFilter("graph-stat"),
  graph_kpi: makeFilter("graph-kpi"),
  graph_spark: makeFilter("graph-spark"),
  graph_plot: makeFilter("graph-plot"),
  graph_bars: makeFilter("graph-bars"),
  graph_slope: makeFilter("graph-slope"),
  graph_cells: makeFilter("graph-cells"),
  graph_meter: makeFilter("graph-meter"),
  graph_waffle: makeFilter("graph-waffle"),
  graph_stack: makeFilter("graph-stack"),
  graph_funnel: makeFilter("graph-funnel"),
  graph_waterfall: makeFilter("graph-waterfall"),
  graph_rank: makeFilter("graph-rank"),
  graph_bullet: makeFilter("graph-bullet"),
  graph_heatmap: makeFilter("graph-heatmap"),
  graph_activity: makeFilter("graph-activity"),
  graph_calendar: makeFilter("graph-calendar"),
  graph_uptime: makeFilter("graph-uptime"),
  graph_flow: makeFilter("graph-flow"),
  graph_tree: makeFilter("graph-tree"),
  graph_timeline: makeFilter("graph-timeline"),
  graph_gantt: makeFilter("graph-gantt"),
  graph_check: makeFilter("graph-check"),
  graph_board: makeFilter("graph-board"),
  graph_score: makeFilter("graph-score"),
  graph_timer: makeFilter("graph-timer"),
  graph_countdown: makeFilter("graph-countdown")
};
var graphFilterNames = Object.keys(graphFilters);
var graphFilterMetadata = Object.fromEntries(
  Object.entries(graphFilters).map(([name, filter]) => [
    name,
    filter.metadata ?? { example: name }
  ])
);
function createGraphFilters(names) {
  const out = {};
  for (const name of names) {
    const filter = graphFilters[name];
    if (filter) out[name] = filter;
  }
  return out;
}
export {
  CONTENT_SLUGS,
  GRAPH_FILTER_SLUGS,
  GRAPH_VALUE_KEY,
  createGraphFilters,
  filterName,
  graphFilterMetadata,
  graphFilterNames,
  graphFilters
};

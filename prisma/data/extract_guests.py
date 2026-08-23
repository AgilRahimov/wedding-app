import openpyxl, re, json, sys

SRC = '/Users/agilrahimov/Documents/Wed/Spisok v2.xlsx'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/private/tmp/claude-501/-Users-agilrahimov-Documents-Wed/ed8fc8ca-0931-413c-b779-c13ca75b2ca6/scratchpad/guests.json'

wb = openpyxl.load_workbook(SRC, read_only=True, data_only=False)
ws = wb['Sheet1']
grid = {}
for row in ws.iter_rows():
    for c in row:
        if c.value is not None and str(c.value).strip():
            grid[(c.row, c.column)] = str(c.value).strip() if isinstance(c.value, str) else c.value

HEADERS = {'Name', '+1', 'Group', 'Comment', 'Column1', 'Column2', 'Count'}

blocks = []
for (r, col), v in grid.items():
    if not isinstance(v, str):
        continue
    m = re.match(r'=COUNTA\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)', v)
    if m:
        c1, r1, c2, r2 = m.groups()
        ncol = openpyxl.utils.column_index_from_string(c1)
        wide = openpyxl.utils.column_index_from_string(c2) > ncol
        blocks.append({'anchor_row': r, 'ncol': ncol, 'start': int(r1), 'end': int(r2), 'wide': wide})

blocks.sort(key=lambda b: (b['anchor_row'], b['ncol']))

def txt(r, c):
    v = grid.get((r, c))
    return v.strip() if isinstance(v, str) else v

households = []
section_counter = 0
for b in blocks:
    N = b['ncol']
    # block label: any text in the anchor row within the block's 5 columns (or col N..N for narrow)
    width = 5 if b['wide'] else 1
    label = None
    for ar in (b['anchor_row'], b['anchor_row'] - 1):
        for c in range(N, N + width):
            v = txt(ar, c)
            if isinstance(v, str) and v not in HEADERS and not v.startswith('='):
                label = v
                break
        if label:
            break
    section_counter += 1
    section = 'S{:02d}'.format(section_counter)
    for r in range(b['start'], b['end'] + 1):
        name = txt(r, N)
        if not isinstance(name, str) or name.startswith('='):
            continue
        plus = txt(r, N + 1) if b['wide'] else None
        plus_count = int(plus) if isinstance(plus, (int, float)) else 0
        rowgroup = txt(r, N + 3) if b['wide'] else None
        comment = txt(r, N + 4) if b['wide'] else None
        col1 = txt(r, N + 2) if b['wide'] else None
        notes = []
        if isinstance(comment, str) and not comment.startswith('='):
            notes.append(comment)
        if isinstance(col1, str) and not col1.startswith('='):
            notes.append(col1)
        group = label or (rowgroup if isinstance(rowgroup, str) else None) or 'Section {:02d}'.format(section_counter)
        via = rowgroup if (isinstance(rowgroup, str) and label and rowgroup != label) else None
        households.append({
            'section': section,
            'group': group,
            'name': re.sub(r'\s+', ' ', name),
            'plusCount': plus_count,
            'via': via,
            'note': '; '.join(notes) if notes else None,
        })

# orphan check: text cells that look like data but are outside every block's counted range
covered = set()
for b in blocks:
    width = 5 if b['wide'] else 1
    for r in range(b['start'], b['end'] + 1):
        for c in range(b['ncol'], b['ncol'] + width):
            covered.add((r, c))
    for c in range(b['ncol'], b['ncol'] + width):
        covered.add((b['anchor_row'], c))
        covered.add((b['anchor_row'] + 1, c))  # header row
orphans = []
for (r, c), v in grid.items():
    if (r, c) in covered or c <= 2:
        continue
    if isinstance(v, str) and not v.startswith('=') and v not in HEADERS:
        orphans.append((r, c, v))
if orphans:
    print('ORPHAN cells (not in any block):')
    for r, c, v in sorted(orphans):
        print('  R{}C{}: {}'.format(r, c, v))

names = len(households)
plus = sum(h['plusCount'] for h in households)
groups = {}
for h in households:
    groups[h['group']] = groups.get(h['group'], 0) + 1 + h['plusCount']

print('blocks:', len(blocks))
print('primary guests:', names, ' +1s:', plus, ' TOTAL SEATS:', names + plus)
for g, n in sorted(groups.items(), key=lambda kv: -kv[1]):
    print('  {:28s} {}'.format(g, n))

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(households, f, ensure_ascii=False, indent=1)
print('wrote', OUT)

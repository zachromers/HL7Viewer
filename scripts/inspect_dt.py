import json
from collections import defaultdict

with open(r'c:/Users/zachr/AppData/Local/Temp/hl7-251.json') as f:
    d = json.load(f)

by_parent = defaultdict(list)
for dt in d['dataTypes']:
    p = dt['dt']['parent']
    by_parent[p].append(dt['dt'])

for name in ['ST', 'ID', 'IS', 'NM', 'DT', 'TM', 'TS', 'CE', 'XCN', 'XPN', 'HD', 'CX', 'XAD', 'XTN', 'PL', 'EI', 'CQ', 'CP', 'CE_0396', 'FN', 'DTM']:
    if name in by_parent:
        comps = sorted(by_parent[name], key=lambda x: int(x['idx']))
        s = ', '.join(str(c['idx']) + '=' + c['desc'] for c in comps)
        print(name + ': [' + s + ']')
    else:
        print(name + ': (primitive/not found)')

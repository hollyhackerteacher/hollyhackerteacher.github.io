"""Convert the current sale sheet and configured Stripe links into the public catalog."""
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

source = Path(r'C:\Users\admin\Downloads\Laptop Sale Sheet (1).xlsx')
out = Path(__file__).resolve().parents[1] / 'assets' / 'laptops.json'
stripe_links = json.loads((Path(__file__).with_name('laptop-stripe-links.json')).read_text(encoding='utf-8'))


def sheet_rows(path):
    ns = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            shared = [''.join(t.text or '' for t in item.findall('.//x:t', ns))
                      for item in root.findall('x:si', ns)]
        root = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        for row in root.findall('.//x:sheetData/x:row', ns):
            cells = {}
            for cell in row.findall('x:c', ns):
                column = re.match(r'[A-Z]+', cell.attrib['r']).group()
                value = cell.find('x:v', ns)
                inline = cell.find('x:is', ns)
                if value is not None:
                    raw = shared[int(value.text)] if cell.attrib.get('t') == 's' else value.text
                    cells[column] = float(raw) if cell.attrib.get('t') in (None, 'n') and re.fullmatch(r'-?\d+(?:\.\d+)?', raw or '') else raw
                elif inline is not None:
                    cells[column] = ''.join(t.text or '' for t in inline.findall('.//x:t', ns))
            yield cells


rows = list(sheet_rows(source))[:17]
headers = rows[0]
photos = {
    'Dell Latitude 5520': ['latitude-5520-front.png', 'latitude-5520-ports.jpg'],
    'Dell Precision 7550': ['precision-7550-front.png'],
    'Dell Precision 7560': ['precision-7560-front.png', 'precision-7560-rear.png', 'precision-7560-left.png', 'precision-7560-right.png'],
    'Dell Precision 7670': ['precision-7670-front.png', 'precision-7670-lid.png', 'precision-7670-left.png', 'precision-7670-right.png'],
    'MSI Prestige 14 AI Studio': ['prestige-14-front.png', 'prestige-14-closed.png', 'prestige-14-left.png', 'prestige-14-right.png'],
}
products = []

for row in rows[1:]:
    item = {name: row.get(column) for column, name in headers.items()}
    stock = int(item['Stock #'])
    listed = stock in (33, 34, 35, 36)
    battery_details = item.get('Battery Details') or None
    cpu = item['CPU']
    if item['Model'] == 'Dell Latitude 5520':
        cpu = '11th Gen Intel Core i7-1185G7 @ 3.00 GHz'
    else:
        cpu = cpu.replace('Intel(R)', 'Intel').replace('Core(TM)', 'Core').replace(' CPU', '')
    condition = item['Condition']
    if stock == 34:
        condition = ('Functions well. Small crack on the left corner of the keyboard case; '
                     'the left touchpad click sometimes sticks. An external mouse can be used.')
    products.append({
        'id': f'laptop-{stock}',
        'stockNumber': stock,
        'serial': item['Serial'],
        'model': item['Model'],
        'cpu': cpu,
        'coresThreads': item['CPU cores / Threads'],
        'screen': item['Screen Size'],
        'ram': item['RAM'],
        'storage': item['Storage'],
        'graphics': item['Graphics'],
        'weight': item['Weight'],
        'dimensions': item['Dimension Inches'].replace(' � ', ' × ').replace('�', '–'),
        'batteryDetails': battery_details,
        'grade': item['Condition Grade'],
        'condition': condition,
        'saleStatus': 'available' if listed else 'coming-soon',
        'priceInCents': int(round(item['Sale Price'] * 100)) if listed else None,
        'currency': 'USD',
        'quantity': 1,
        'runLimit': 1,
        **(stripe_links[str(stock)] if listed else {}),
        'photos': photos[item['Model']],
    })

out.write_text(json.dumps({'products': products}, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {len(products)} listings to {out}')

"""Convert the supplied sale sheet and verified Stripe links into a laptop catalog."""
import json
from pathlib import Path
import openpyxl

source = Path(r'C:\Users\admin\Downloads\Laptop Sale Sheet.xlsx')
out = Path(__file__).resolve().parents[1] / 'assets' / 'laptops.json'
stripe_links = json.loads((Path(__file__).with_name('laptop-stripe-links.json')).read_text(encoding='utf-8'))
sheet = openpyxl.load_workbook(source, data_only=True).active
headers = [cell.value for cell in sheet[1]]

photos = {
    'Dell Latitude 5520': ['latitude-5520-front.png', 'latitude-5520-ports.jpg'],
    'Dell Precision 7550': ['precision-7550-front.png'],
    'Dell Precision 7560': ['precision-7560-front.png', 'precision-7560-rear.png', 'precision-7560-left.png', 'precision-7560-right.png'],
    'Dell Precision 7670': ['precision-7670-front.png', 'precision-7670-lid.png', 'precision-7670-left.png', 'precision-7670-right.png'],
    'MSI Prestige 14 AI Studio': ['prestige-14-front.png', 'prestige-14-closed.png', 'prestige-14-left.png', 'prestige-14-right.png'],
}

products = []
for row in sheet.iter_rows(min_row=2, max_row=17, values_only=True):
    item = dict(zip(headers, row))
    stock = int(item['Stock #'])
    checkout = stripe_links[str(stock)]
    cpu = item['CPU']
    if item['Model'] == 'Dell Latitude 5520':
        cpu = '11th Gen Intel Core i7-1185G7 @ 3.00 GHz'
    else:
        cpu = cpu.replace('Intel(R)', 'Intel').replace('Core(TM)', 'Core').replace(' CPU', '')
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
        'grade': item['Condition Grade'],
        'condition': item['Condition'],
        'priceInCents': int(item['Suggested List'] * 100),
        'currency': 'USD',
        'quantity': 1,
        'runLimit': 1,
        **checkout,
        'photos': photos[item['Model']],
    })

out.write_text(json.dumps({'products': products}, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {len(products)} listings to {out}')

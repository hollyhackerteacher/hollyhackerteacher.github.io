"""Convert the supplied sale sheet into a public, serial-free laptop catalog."""
import json
from pathlib import Path
import openpyxl

source = Path(r'C:\Users\admin\Downloads\Laptop Sale Sheet.xlsx')
out = Path(__file__).resolve().parents[1] / 'assets' / 'laptops.json'
sheet = openpyxl.load_workbook(source, data_only=True).active
headers = [cell.value for cell in sheet[1]]

photos = {
    'Dell Latitude 5520': ['latitude-5520-front.png', 'latitude-5520-ports.jpg'],
    'Dell Precision 7550': ['precision-7550-front.png'],
    'Dell Precision 7560': ['precision-7560-front.jpg'],
    'Dell Precision 7670': ['precision-7670-front.png', 'precision-7670-right.png'],
    'MSI Prestige 14 AI Studio': ['prestige-14-front.png', 'prestige-14-closed.png', 'prestige-14-left.png', 'prestige-14-right.png'],
}

products = []
for row in sheet.iter_rows(min_row=2, max_row=17, values_only=True):
    item = dict(zip(headers, row))
    stock = int(item['Stock #'])
    cpu = item['CPU']
    if item['Model'] == 'Dell Latitude 5520':
        cpu = '11th Gen Intel Core i7 (exact model to verify)'
    else:
        cpu = cpu.replace('Intel(R)', 'Intel').replace('Core(TM)', 'Core').replace(' CPU', '')
    products.append({
        'id': f'laptop-{stock}',
        'stockNumber': stock,
        'model': item['Model'],
        'cpu': cpu,
        'screen': item['Screen Size'],
        'ram': item['RAM'],
        'storage': item['Storage'],
        'graphics': item['Graphics'].split(' - ')[0].strip(),
        'grade': item['Condition Grade'],
        'condition': item['Condition'],
        'priceInCents': int(item['Suggested List'] * 100),
        'currency': 'USD',
        'quantity': 1,
        'runLimit': 1,
        'paymentLink': None,
        'stripeProductId': None,
        'stripePriceId': None,
        'stripePaymentLinkId': None,
        'photos': photos[item['Model']],
    })

out.write_text(json.dumps({'products': products}, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {len(products)} listings to {out}')

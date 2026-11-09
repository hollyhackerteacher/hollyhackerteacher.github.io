from pathlib import Path
from urllib.request import Request, urlopen
from io import BytesIO
from pypdf import PdfReader

out = Path(__file__).resolve().parents[1] / 'assets' / 'laptops'
out.mkdir(parents=True, exist_ok=True)
assets = {
    'latitude-5520-front.png': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/latitude-notebooks/latitude-15-5520/media-gallery/la5520nt_cnb_05000ff090_gy_5000x5000_gettyimages-1254825733.psd?fmt=png-alpha&wid=900',
    'latitude-5520-ports.jpg': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/latitude-notebooks/latitude-15-5520/pdp/laptops-latitude-15-5520-pdp-mod-5.jpg?fmt=jpg&hei=500&wid=965',
    'precision-7560-front.png': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/workstations/mobile-workstations/precision/15-7560/media-gallery/workstation_precision_15_7560_gallery_3.psd?fmt=png-alpha&wid=900',
    'precision-7560-rear.png': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/workstations/mobile-workstations/precision/15-7560/media-gallery/workstation_precision_15_7560_gallery_4.psd?fmt=png-alpha&wid=900',
    'precision-7560-right.png': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/workstations/mobile-workstations/precision/15-7560/media-gallery/workstation_precision_15_7560_gallery_6.psd?fmt=png-alpha&wid=900',
    'precision-7560-left.png': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/workstations/mobile-workstations/precision/15-7560/media-gallery/workstation_precision_15_7560_gallery_7.psd?fmt=png-alpha&wid=900',
    'precision-7670-front.png': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/workstations/mobile-workstations/precision/16-7670/media-gallery/notebook-precision-7670-gray-gallery-1.psd?fmt=png-alpha&wid=900',
    'precision-7670-lid.png': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/workstations/mobile-workstations/precision/16-7670/media-gallery/notebook-precision-7670-gray-gallery-8.psd?fmt=png-alpha&wid=900',
    'precision-7670-left.png': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/workstations/mobile-workstations/precision/16-7670/media-gallery/notebook-precision-7670-gray-gallery-7.psd?fmt=png-alpha&wid=900',
    'precision-7670-right.png': 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/workstations/mobile-workstations/precision/16-7670/media-gallery/notebook-precision-7670-gray-gallery-6.psd?fmt=png-alpha&wid=900',
    'prestige-14-front.png': 'https://storage-asset.msi.com/global/picture/image/feature/nb/Prestige/Prestige14-AI-Studio-C1V/kv-nb-xs.png',
    'prestige-14-closed.png': 'https://storage-asset.msi.com/global/picture/image/feature/nb/Prestige/Prestige14-AI-Studio-C1V/prestige14-ai-evo-grd-top.png',
    'prestige-14-left.png': 'https://storage-asset.msi.com/global/picture/image/feature/nb/Prestige/Prestige14-AI-Studio-C1V/io-nb-left-xs.png',
    'prestige-14-right.png': 'https://storage-asset.msi.com/global/picture/image/feature/nb/Prestige/Prestige14-AI-Studio-C1V/io-nb-right-xs.png',
}
for name, url in assets.items():
    if not (out / name).exists():
        data = urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=20).read()
        (out / name).write_bytes(data)
        print(name, len(data))

pdf = 'https://i.dell.com/sites/csdocuments/Merchandizing_Docs/en/precision-7550-tech-spec-sheet.pdf'
page = PdfReader(BytesIO(urlopen(pdf).read())).pages[0]
for image in page.images:
    if image.name.lower().endswith('.jp2'):
        from PIL import Image
        path = out / 'precision-7550-front.png'
        Image.open(BytesIO(image.data)).save(path, optimize=True)
        print(path.name, path.stat().st_size)

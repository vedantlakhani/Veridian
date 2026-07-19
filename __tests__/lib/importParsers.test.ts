import { parseCsv, parseAmazonOrderHistoryCsv, parseDoorDashOrderExportCsv } from '@/lib/importParsers';

describe('parseCsv', () => {
  it('splits simple comma-delimited rows', () => {
    const rows = parseCsv('a,b,c\n1,2,3');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields containing commas', () => {
    const rows = parseCsv('name,note\n"Smith, John","Says ""hi"""');
    expect(rows).toEqual([
      ['name', 'note'],
      ['Smith, John', 'Says "hi"'],
    ]);
  });

  it('ignores blank lines', () => {
    const rows = parseCsv('a,b\n\n1,2\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseAmazonOrderHistoryCsv', () => {
  const header =
    'Website,Order ID,Order Date,Purchase Order Number,Currency,Unit Price,Unit Price Tax,Shipping Charge,Total Discounts,Total Owed,Shipment Item Subtotal,Shipment Item Subtotal Tax,ASIN,Product Condition,Quantity,Payment Instrument Type,Order Status,Shipment Status,Ship Date,Shipping Option,Shipping Address,Billing Address,Carrier Name & Tracking Number,Product Name,Gift Message,Gift Sender Name,Gift Recipient Contact Details,Item Serial Number';

  it('groups multiple line items under one order by Order ID', () => {
    const csv = [
      header,
      'Amazon.com,111-1111111-1111111,2024-03-01,Not Applicable,USD,19.99,0,0,0,39.98,19.99,0,ASIN1,new,1,Visa,Shipped,Shipped,2024-03-02,Standard,addr,addr,carrier,Wireless Mouse,,,,',
      'Amazon.com,111-1111111-1111111,2024-03-01,Not Applicable,USD,19.99,0,0,0,39.98,19.99,0,ASIN2,new,1,Visa,Shipped,Shipped,2024-03-02,Standard,addr,addr,carrier,USB Cable,,,,',
    ].join('\n');

    const { orders, warnings } = parseAmazonOrderHistoryCsv(csv);
    expect(warnings).toEqual([]);
    expect(orders).toHaveLength(1);
    expect(orders[0].merchant).toBe('Amazon');
    expect(orders[0].orderDate).toBe('2024-03-01');
    expect(orders[0].items).toHaveLength(2);
    expect(orders[0].items[0].name).toBe('Wireless Mouse');
    expect(orders[0].items[0].priceUsd).toBeCloseTo(19.99);
  });

  it('applies quantity to compute a line item total', () => {
    const csv = [
      header,
      'Amazon.com,222-2222222-2222222,2024-05-10,Not Applicable,USD,10.00,0,0,0,20.00,10.00,0,ASIN3,new,2,Visa,Shipped,Shipped,2024-05-11,Standard,addr,addr,carrier,Notebook,,,,',
    ].join('\n');
    const { orders } = parseAmazonOrderHistoryCsv(csv);
    expect(orders[0].items[0].qty).toBe(2);
    expect(orders[0].items[0].priceUsd).toBeCloseTo(20.0);
  });

  it('warns when a row currency is not USD, and still surfaces the order/currency for the caller to gate on', () => {
    const csv = [
      header,
      'Amazon.co.uk,333-3333333-3333333,2024-06-01,Not Applicable,GBP,15.00,0,0,0,15.00,15.00,0,ASIN4,new,1,Visa,Shipped,Shipped,2024-06-02,Standard,addr,addr,carrier,Kettle,,,,',
    ].join('\n');
    const { orders, warnings } = parseAmazonOrderHistoryCsv(csv);
    expect(orders).toHaveLength(1);
    expect(orders[0].currency).toBe('GBP');
    expect(warnings.some((w) => w.includes('not USD'))).toBe(true);
  });

  it('does not warn for a USD row', () => {
    const csv = [
      header,
      'Amazon.com,444-4444444-4444444,2024-06-01,Not Applicable,USD,15.00,0,0,0,15.00,15.00,0,ASIN5,new,1,Visa,Shipped,Shipped,2024-06-02,Standard,addr,addr,carrier,Kettle,,,,',
    ].join('\n');
    const { warnings } = parseAmazonOrderHistoryCsv(csv);
    expect(warnings.some((w) => w.includes('not USD'))).toBe(false);
  });

  it('skips rows missing an Order Date and reports a warning', () => {
    const csv = [
      header,
      'Amazon.com,333-3333333-3333333,,Not Applicable,USD,5.00,0,0,0,5.00,5.00,0,ASIN4,new,1,Visa,Shipped,Shipped,2024-05-11,Standard,addr,addr,carrier,Pen,,,,',
    ].join('\n');
    const { orders, warnings } = parseAmazonOrderHistoryCsv(csv);
    expect(orders).toHaveLength(0);
    expect(warnings.some((w) => w.includes('333-3333333-3333333'))).toBe(true);
  });

  it('returns a warning and no orders for an empty file', () => {
    const { orders, warnings } = parseAmazonOrderHistoryCsv('');
    expect(orders).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('parseDoorDashOrderExportCsv', () => {
  it('maps rows via header-name aliasing, tolerant of column order', () => {
    const csv = ['Date,Restaurant,Item,Quantity,Item Price,Order Total', '2024-04-01,Taco Place,Burrito,1,12.50,15.00'].join(
      '\n',
    );
    const { orders, warnings } = parseDoorDashOrderExportCsv(csv);
    expect(orders).toHaveLength(1);
    expect(orders[0].merchant).toBe('Taco Place');
    expect(orders[0].items[0].name).toBe('Burrito');
    expect(orders[0].items[0].categoryGuess).toBe('food delivery');
    expect(orders[0].confidence).toBeLessThan(1); // unverified format — lower confidence than Amazon's
    expect(warnings.some((w) => w.toLowerCase().includes('order id'))).toBe(true);
  });

  it('reports failure when no date column can be found at all', () => {
    const csv = ['Restaurant,Item', 'Taco Place,Burrito'].join('\n');
    const { orders, warnings } = parseDoorDashOrderExportCsv(csv);
    expect(orders).toEqual([]);
    expect(warnings.some((w) => w.includes('date column'))).toBe(true);
  });

  it('groups rows without an Order ID column by date+merchant', () => {
    const csv = [
      'Date,Restaurant,Item,Item Price',
      '2024-04-02,Cafe,Coffee,4.50',
      '2024-04-02,Cafe,Bagel,3.00',
    ].join('\n');
    const { orders } = parseDoorDashOrderExportCsv(csv);
    expect(orders).toHaveLength(1);
    expect(orders[0].items).toHaveLength(2);
  });
});


import { Transaction, ShopSettings, ReceiptConfig } from '../types';

interface PrintOptions {
  copies?: number;
  fontSize?: string; // e.g. "12px"
}

const buildReceiptParts = (transaction: Transaction, settings: ShopSettings, options: PrintOptions = {}) => {
  const { shopName, address, contact, email, currency } = settings;
  const config: ReceiptConfig = settings.receipt || { 
      showLogo: false, 
      showShopName: true, 
      showAddress: true, 
      showContact: true, 
      paperSize: '80mm' 
  };
  
  const date = new Date(transaction.timestamp).toLocaleString();
  const sp = '&nbsp;'; // 1 HTML space

  const width = config.paperSize === '58mm' ? '190px' : '300px';
  const defaultFontSize = config.paperSize === '58mm' ? '10px' : '12px';
  const fontSize = options.fontSize || defaultFontSize;

  const styles = `
    <style>
      @page { size: auto; margin: 0mm; }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        font-size: ${fontSize}; 
        color: #000; 
      }
      .receipt-container {
        width: ${width}; 
        margin: 0 auto;
        box-sizing: border-box;
      }
      .page-break {
        page-break-after: always;
        border-bottom: 1px dashed #ccc;
        margin-bottom: 20px;
        padding-bottom: 20px;
        display: block;
      }
      @media print {
        .page-break {
           border-bottom: none;
           margin-bottom: 0;
           padding-bottom: 0;
        }
        body { background: none; }
      }
      .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
      .shop-name { font-size: 1.4em; font-weight: bold; margin: 0 0 5px 0; }
      .logo { max-width: 60%; max-height: 80px; margin-bottom: 5px; }
      .meta { font-size: 0.9em; margin-bottom: 5px; }
      .divider { border-top: 1px dashed #000; margin: 10px 0; }
      .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .item-name { font-weight: bold; }
      .item-detail { margin-left: 10px; font-size: 0.9em; color: #444; }
      .totals { margin-top: 10px; }
      .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
      .grand-total { font-size: 1.2em; font-weight: bold; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; }
      .footer { text-align: center; margin-top: 20px; font-size: 0.9em; padding-bottom: 5px; }
      .payments { margin-top: 10px; font-size: 0.9em; }
      .custom-message { font-style: italic; margin: 8px 0; white-space: pre-wrap; }
    </style>
  `;

  const itemsHtml = transaction.items.map(item => `
    <div>
      <div class="item-row">
        <span>${item.quantity}x ${item.name}${item.isReward ? ' **REDEEM**' : ''}</span>
        <span>${currency}${sp}${(item.price * item.quantity).toFixed(2)}</span>
      </div>
      ${item.selectedAddons && item.selectedAddons.length > 0 ? `
        <div class="item-detail">
          + ${item.selectedAddons.map(a => a.name).join(', ')}
        </div>
      ` : ''}
      ${item.note ? `<div class="item-detail" style="font-style: italic;"><strong>Note:</strong> ${item.note}</div>` : ''}
    </div>
  `).join('');

  const paymentsHtml = transaction.payments.map(p => `
    <div class="total-row">
      <span>${p.methodName}</span>
      <span>${currency}${sp}${p.amount.toFixed(2)}</span>
    </div>
  `).join('');

  const content = `
    <div class="receipt-container">
      <div class="header">
        ${config.showLogo && config.logo ? `<img src="${config.logo}" class="logo" />` : ''}
        ${config.showShopName ? `<h1 class="shop-name">${shopName}</h1>` : ''}
        ${config.showAddress ? `<div>${address}</div>` : ''}
        ${config.showContact ? `<div>${contact}</div>` : ''}
        ${config.showContact && email ? `<div>${email}</div>` : ''}
        ${config.headerText ? `<div class="custom-message">${config.headerText}</div>` : ''}
      </div>
      <div class="meta">
        ${transaction.cashierName ? `<div>Cashier: ${transaction.cashierName}</div>` : ''}
        ${transaction.memberName ? `<div>Customer: ${transaction.memberName}</div>` : ''}
        <div>${date}</div>
        <div>Order: ${transaction.orderNumber || transaction.id.slice(-6)}</div>
      </div>
      <div class="divider"></div>
      <div class="items">${itemsHtml}</div>
      <div class="divider"></div>
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><span>${currency}${sp}${transaction.subtotal.toFixed(2)}</span></div>
        ${transaction.discount && transaction.discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${currency}${sp}${transaction.discount.toFixed(2)}</span></div>` : ''}
        <div class="total-row"><span>Tax</span><span>${currency}${sp}${transaction.taxTotal.toFixed(2)}</span></div>
        <div class="total-row grand-total"><span>TOTAL</span><span>${currency}${sp}${transaction.total.toFixed(2)}</span></div>
      </div>
      <div class="payments">
        <div style="font-weight:bold; margin-bottom:2px;">Payment</div>
        ${paymentsHtml}
        ${transaction.payments.reduce((sum, p) => sum + p.amount, 0) < transaction.total ? `
            <div class="total-row" style="margin-top:2px; font-style:italic;">
              <span>Balance Due</span>
              <span>${currency}${sp}${(transaction.total - transaction.payments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}</span>
            </div>
        ` : `
            <div class="total-row" style="margin-top:2px;">
              <span>Change</span>
              <span>${currency}${sp}${(transaction.payments.reduce((sum, p) => sum + p.amount, 0) - transaction.total).toFixed(2)}</span>
            </div>
        `}
      </div>
      <div class="footer">
        ${config.footerText ? `<div class="custom-message">${config.footerText}</div>` : ''}
        ${transaction.note ? `<div>${transaction.note}</div>` : ''}
        <br/><div>Thank you for your visit!</div>
      </div>
    </div>
  `;

  return { styles, content };
};

export const generateReceiptHtml = (transaction: Transaction, settings: ShopSettings, options: PrintOptions = {}) => {
  const { styles, content } = buildReceiptParts(transaction, settings, options);
  const copies = Math.max(1, options.copies || 1);
  let bodyContent = '';
  for (let i = 0; i < copies; i++) { bodyContent += content; if (i < copies - 1) bodyContent += '<div class="page-break"></div>'; }
  return `<html><head><title>Receipt</title>${styles}</head><body>${bodyContent}</body></html>`;
};

export const generateReceiptEmailHtml = (transaction: Transaction, settings: ShopSettings) => {
    const { shopName, address, contact, email, currency } = settings;
    const config: ReceiptConfig = settings.receipt || { showLogo: false, showShopName: true, showAddress: true, showContact: true, paperSize: '80mm' };
    const date = new Date(transaction.timestamp).toLocaleString();
    const sp = '&nbsp;';
    const tr = (left: string, right: string, bold = false, indent = false) => `<tr><td style="text-align: left; padding: 2px 0; ${bold ? 'font-weight: bold;' : ''} ${indent ? 'padding-left: 15px; font-size: 0.9em; color: #555;' : ''}">${left}</td><td style="text-align: right; padding: 2px 0; ${bold ? 'font-weight: bold;' : ''}">${right}</td></tr>`;
    let itemsRows = '';
    transaction.items.forEach(item => {
        itemsRows += tr(`${item.quantity}x ${item.name} ${item.isReward ? '(Redeem)' : ''}`, `${currency}${sp}${(item.price * item.quantity).toFixed(2)}`);
        if (item.selectedAddons) item.selectedAddons.forEach(addon => { itemsRows += tr(`+ ${addon.name}`, `${currency}${sp}${addon.price.toFixed(2)}`, false, true); });
        if (item.note) itemsRows += tr(`Note: ${item.note}`, '', false, true);
    });
    let paymentsRows = '';
    transaction.payments.forEach(p => { paymentsRows += tr(p.methodName, `${currency}${sp}${p.amount.toFixed(2)}`); });
    const paid = transaction.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = transaction.total - paid;
    return `<!DOCTYPE html><html><body style="background-color: #f3f4f6; padding: 20px; font-family: sans-serif;"><div style="max-width: 350px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); font-family: 'Courier New', Courier, monospace; color: #000;"><div style="text-align: center; margin-bottom: 15px;">${config.showLogo && config.logo ? `<img src="${config.logo}" style="max-width: 100px; height: auto; margin-bottom: 5px;" />` : ''}${config.showShopName ? `<h2 style="margin: 0; font-size: 1.5em; font-weight: bold;">${shopName}</h2>` : ''}${config.showAddress && address ? `<div style="font-size: 0.9em;">${address}</div>` : ''}${config.showContact && contact ? `<div style="font-size: 0.9em;">${contact}</div>` : ''}${config.showContact && email ? `<div style="font-size: 0.9em;">${email}</div>` : ''}</div><div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div><div style="font-size: 0.9em; margin-bottom: 10px;"><div>${date}</div><div>Order: ${transaction.orderNumber || transaction.id}</div>${transaction.memberName ? `<div>Customer: ${transaction.memberName}</div>` : ''}${transaction.cashierName ? `<div>Cashier: ${transaction.cashierName}</div>` : ''}</div><div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div><table style="width: 100%; border-collapse: collapse;">${itemsRows}</table><div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div><table style="width: 100%; border-collapse: collapse;">${tr('Subtotal', `${currency}${sp}${transaction.subtotal.toFixed(2)}`)}${transaction.discount ? tr('Discount', `-${currency}${sp}${transaction.discount.toFixed(2)}`) : ''}${tr('Tax', `${currency}${sp}${transaction.taxTotal.toFixed(2)}`)}<tr><td colspan="2" style="padding: 5px 0;"></td></tr>${tr('TOTAL', `${currency}${sp}${transaction.total.toFixed(2)}`, true)}</table><div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div><div style="font-weight: bold; margin-bottom: 5px;">Payment</div><table style="width: 100%; border-collapse: collapse;">${paymentsRows}${balance > 0.01 ? tr('Balance Due', `${currency}${sp}${balance.toFixed(2)}`, false) : tr('Change', `${currency}${sp}${Math.max(0, paid - transaction.total).toFixed(2)}`, false)}</table><div style="text-align: center; margin-top: 20px; font-size: 0.9em;">${config.footerText ? `<p style="margin: 5px 0;">${config.footerText}</p>` : ''}${transaction.note ? `<p style="margin: 5px 0; font-style: italic;">Note: ${transaction.note}</p>` : ''}<p style="margin: 15px 0 5px 0;">Thank you for your visit!</p></div></div></body></html>`;
};

export const printReceipt = (transaction: Transaction, settings: ShopSettings, options: PrintOptions = {}) => {
  const popupWin = window.open('', '_blank', 'width=400,height=600,left=200,top=200');
  if (!popupWin) { alert("Please allow popups to print receipts."); return; }
  popupWin.document.open(); popupWin.document.write(generateReceiptHtml(transaction, settings, options)); popupWin.document.close();
  popupWin.onload = function() { popupWin.focus(); popupWin.print(); setTimeout(function(){ popupWin.close(); }, 500); }
};

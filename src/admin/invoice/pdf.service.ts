import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import PDFDocument from 'pdfkit-table';

@Injectable()
export class PdfService {
  async generateInvoicePdf(invoice: any, client: any, items: any[]): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
        if (!fs.existsSync(invoicesDir)) {
          fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const fileName = `${invoice.invoice_number || 'INV-' + invoice.id}.pdf`;
        const filePath = path.join(invoicesDir, fileName);
        const writeStream = fs.createWriteStream(filePath);

        // Register Fonts
        const amiriRegularPath = path.join(process.cwd(), 'assets', 'fonts', 'Amiri-Regular.ttf');
        const amiriBoldPath = path.join(process.cwd(), 'assets', 'fonts', 'Amiri-Bold.ttf');
        
        if (fs.existsSync(amiriRegularPath)) {
          doc.registerFont('Amiri', amiriRegularPath);
          doc.registerFont('Amiri-Bold', amiriBoldPath);
          doc.font('Amiri');
        }

        doc.pipe(writeStream);

        // Header
        doc.font('Amiri-Bold').fontSize(20).text('Listo Supply Solutions', { align: 'center' });
        doc.moveDown();
        doc.font('Amiri').fontSize(10).text('123 Supply Chain Ave.', { align: 'center' });
        doc.text('Cairo, Egypt', { align: 'center' });
        doc.moveDown(2);

        // Billing Details
        doc.fontSize(14).text('INVOICE', { underline: true });
        doc.moveDown();

        doc.fontSize(10);
        doc.text(`Invoice Number: ${invoice.invoice_number}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Sales Order Ref: ${invoice.sales_order_reference || 'N/A'}`);
        doc.text(`Payment Method: ${invoice.payment_method === 'COD' ? 'Cash on Delivery' : invoice.payment_method}`);
        doc.moveDown();

        doc.text(`Bill To:`, { underline: true });
        // Enable Arabic RTL ligatures
        const textOptions = { features: ['rtla'] } as any;
        doc.text(`${client.company_name}`, textOptions);
        doc.text(`${client.email}`);
        if (client.commercial_registration) {
          doc.text(`Commercial Registration: ${client.commercial_registration}`);
        }
        if (client.tax_registration) {
          doc.text(`Tax Registration: ${client.tax_registration}`);
        }
        doc.moveDown(2);

        // Table
        const table = {
          headers: ['Item', 'Qty', 'Unit Price', 'Line Total'],
          rows: items.map(item => [
            item.product_name,
            item.quantity.toString(),
            Number(item.unit_price).toFixed(2),
            (Number(item.unit_price) * item.quantity).toFixed(2)
          ]),
        };

        doc.table(table, {
          prepareHeader: () => doc.font('Amiri-Bold').fontSize(10),
          prepareRow: (row, i) => doc.font('Amiri').fontSize(10)
        });
        
        doc.moveDown();

        // Totals
        const leftCol = 350;
        doc.text(`Subtotal: ${invoice.currency} ${Number(invoice.subtotal).toFixed(2)}`, leftCol);
        doc.text(`Tax (${(Number(invoice.tax_rate) * 100).toFixed(0)}%): ${invoice.currency} ${Number(invoice.tax_amount).toFixed(2)}`, leftCol);
        doc.font('Amiri-Bold');
        doc.text(`Grand Total: ${invoice.currency} ${Number(invoice.grand_total).toFixed(2)}`, leftCol);
        doc.font('Amiri');

        doc.moveDown(4);

        // Footer
        doc.fontSize(10).text('Thank you for your business. Payment is due within the agreed terms.', { align: 'center' });
        doc.text('For inquiries, please contact support@listosupply.com.', { align: 'center' });

        doc.end();

        writeStream.on('finish', () => {
          resolve(`/uploads/invoices/${fileName}`);
        });

        writeStream.on('error', (err) => {
          reject(err);
        });

      } catch (error) {
        reject(error);
      }
    });
  }
}

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import PDFDocument from 'pdfkit-table';

@Injectable()
export class PdfService {
  async generateInvoicePdf(invoice: any, client: any, items: any[], order?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        const fileName = `INV-${invoice.id}-${Date.now()}.pdf`;
        const uploadsDir = path.join(__dirname, '../../..', 'uploads', 'invoices');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filePath = path.join(uploadsDir, fileName);
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Load Arabic fonts
        const fontRegular = path.join(__dirname, '../../../assets/fonts/Amiri-Regular.ttf');
        const fontBold = path.join(__dirname, '../../../assets/fonts/Amiri-Bold.ttf');
        
        let fontName = 'Helvetica';
        let fontBoldName = 'Helvetica-Bold';
        
        if (fs.existsSync(fontRegular) && fs.existsSync(fontBold)) {
          try {
            doc.registerFont('Amiri', fontRegular);
            doc.registerFont('Amiri-Bold', fontBold);
            // Test if fontkit can actually parse it without throwing
            doc.font('Amiri-Bold');
            doc.font('Amiri');
            fontName = 'Amiri';
            fontBoldName = 'Amiri-Bold';
          } catch (err) {
            console.warn('Failed to load Amiri fonts, falling back to Helvetica:', err);
            fontName = 'Helvetica';
            fontBoldName = 'Helvetica-Bold';
          }
        }

        // Header
        doc.font(fontBoldName).fontSize(24).text('INVOICE', { align: 'right' });
        doc.font(fontName).fontSize(10).text(`Invoice Number: ${invoice.invoice_number}`, { align: 'right' });
        doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: 'right' });
        if (invoice.due_date) {
          doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, { align: 'right' });
        }
        
        doc.moveDown(2);

        // Company Details (Left)
        const leftColX = 50;
        doc.font(fontBoldName).fontSize(14).text('B2B Supply Co.', leftColX, 120);
        doc.font(fontName).fontSize(10).text('123 Supply Chain Ave.\nBusiness District, Cairo 11511', leftColX, 140);
        
        // Client Details (Right)
        const rightColX = 300;
        doc.font(fontBoldName).fontSize(12).text('Bill To:', rightColX, 120);
        doc.font(fontName).fontSize(10);
        if (client) {
          // Use { features: ['rtla'] } to render right-to-left ligatures correctly
          doc.text(client.company_name, rightColX, 135, { features: ['rtla'] });
          doc.text(client.email, rightColX, 150);
          if (client.tax_id) doc.text(`Tax ID: ${client.tax_id}`, rightColX, 165);
          if (client.commercial_register) doc.text(`CR: ${client.commercial_register}`, rightColX, 180);
        } else {
          doc.text('Client details unavailable', rightColX, 135);
        }

        doc.moveDown(4);

        // Items Table Header
        const tableTop = 230;
        doc.font(fontBoldName).fontSize(10);
        doc.text('Item', 50, tableTop);
        doc.text('Quantity', 280, tableTop);
        doc.text('Unit Price', 350, tableTop);
        doc.text('Total', 450, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        let yPosition = tableTop + 25;
        doc.font(fontName);

        for (const item of items) {
          const itemTotal = Number(item.unit_price) * item.quantity;
          doc.text(item.product_name || `Product #${item.product_id}`, 50, yPosition);
          doc.text(item.quantity.toString(), 280, yPosition);
          doc.text(`${invoice.currency} ${Number(item.unit_price).toFixed(2)}`, 350, yPosition);
          doc.text(`${invoice.currency} ${itemTotal.toFixed(2)}`, 450, yPosition);
          yPosition += 20;
        }

        doc.moveTo(50, yPosition + 10).lineTo(550, yPosition + 10).stroke();
        
        doc.moveDown();

        // Totals
        const leftCol = 350;
        yPosition += 20;
        doc.text(`Subtotal: ${invoice.currency} ${Number(invoice.subtotal).toFixed(2)}`, leftCol, yPosition);
        
        if (order && order.discount_amount && Number(order.discount_amount) > 0) {
          yPosition += 15;
          const discountLabel = order.discount_percentage 
            ? `Discount (${Number(order.discount_percentage)}%): -${invoice.currency} ${Number(order.discount_amount).toFixed(2)}`
            : `Discount: -${invoice.currency} ${Number(order.discount_amount).toFixed(2)}`;
          doc.text(discountLabel, leftCol, yPosition);
        }

        yPosition += 15;
        doc.text(`Tax (${(Number(invoice.tax_rate) * 100).toFixed(0)}%): ${invoice.currency} ${Number(invoice.tax_amount).toFixed(2)}`, leftCol, yPosition);
        
        yPosition += 15;
        doc.font(fontBoldName);
        doc.text(`Grand Total: ${invoice.currency} ${Number(invoice.grand_total).toFixed(2)}`, leftCol, yPosition);
        doc.font(fontName);

        doc.moveDown(4);

        // Footer
        doc.fontSize(10).text('Thank you for your business. Payment is due within the agreed terms.', 50, yPosition + 60, { align: 'center', width: 500 });
        doc.text('For inquiries, please contact support@listosupply.com.', 50, yPosition + 75, { align: 'center', width: 500 });

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

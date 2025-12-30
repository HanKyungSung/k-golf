/**
 * Receipt Formatter Service
 * Formats receipt data for thermal printers
 */

export interface ReceiptData {
  receiptNumber?: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  roomName?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
}

export interface ThermalCommand {
  type: 'text' | 'bold' | 'align' | 'size' | 'line' | 'cut' | 'newline';
  value?: string | number | boolean;
}

export class ReceiptFormatter {
  private commands: ThermalCommand[] = [];
  private width: number;

  constructor(width: number = 48) {
    this.width = width;
  }

  bold(enabled: boolean): void {
    this.commands.push({ type: 'bold', value: enabled });
  }

  align(alignment: 'left' | 'center' | 'right'): void {
    this.commands.push({ type: 'align', value: alignment });
  }

  size(width: number, height: number): void {
    this.commands.push({ type: 'size', value: `${width},${height}` });
  }

  text(content: string): void {
    this.commands.push({ type: 'text', value: content });
  }

  line(): void {
    this.commands.push({ type: 'line' });
  }

  newline(): void {
    this.commands.push({ type: 'newline' });
  }

  cut(): void {
    this.commands.push({ type: 'cut' });
  }

  table(columns: Array<{ text: string; align: 'left' | 'center' | 'right'; width: number }>): void {
    let row = '';
    columns.forEach(col => {
      const colWidth = Math.floor(this.width * col.width);
      let text = col.text;
      
      // Truncate if too long
      if (text.length > colWidth) {
        text = text.substring(0, colWidth - 2) + '..';
      }
      
      // Pad based on alignment
      if (col.align === 'left') {
        text = text.padEnd(colWidth, ' ');
      } else if (col.align === 'right') {
        text = text.padStart(colWidth, ' ');
      } else {
        const leftPad = Math.floor((colWidth - text.length) / 2);
        text = text.padStart(leftPad + text.length, ' ').padEnd(colWidth, ' ');
      }
      
      row += text;
    });
    
    this.text(row);
  }

  formatReceipt(data: ReceiptData): ThermalCommand[] {
    this.commands = [];

    // Header
    this.align('center');
    this.size(1, 1);
    this.bold(true);
    this.text('K ONE GOLF');
    this.newline();
    this.bold(false);
    this.size(0, 0);
    this.text('Golf Simulator');
    this.newline();
    this.line();
    this.newline();

    // Receipt info
    this.align('left');
    this.text(`Receipt: ${data.receiptNumber || 'N/A'}`);
    this.newline();
    this.text(`Date: ${data.date}`);
    this.newline();
    
    if (data.customerName) {
      this.text(`Customer: ${data.customerName}`);
      this.newline();
    }
    
    if (data.roomName) {
      this.text(`Room: ${data.roomName}`);
      this.newline();
    }
    
    this.line();
    this.newline();

    // Items header
    this.bold(true);
    this.table([
      { text: 'Item', align: 'left', width: 0.5 },
      { text: 'Qty', align: 'center', width: 0.2 },
      { text: 'Price', align: 'right', width: 0.3 }
    ]);
    this.newline();
    this.bold(false);
    this.line();
    this.newline();

    // Items
    data.items.forEach(item => {
      this.table([
        { text: item.name, align: 'left', width: 0.5 },
        { text: item.quantity.toString(), align: 'center', width: 0.2 },
        { text: `$${item.price.toFixed(2)}`, align: 'right', width: 0.3 }
      ]);
      this.newline();
    });

    this.line();
    this.newline();

    // Totals
    this.align('right');
    this.text(`Subtotal: $${data.subtotal.toFixed(2)}`);
    this.newline();
    this.text(`Tax: $${data.tax.toFixed(2)}`);
    this.newline();
    this.bold(true);
    this.size(1, 1);
    this.text(`TOTAL: $${data.total.toFixed(2)}`);
    this.newline();
    this.bold(false);
    this.size(0, 0);
    this.newline();

    // Footer
    this.align('center');
    this.line();
    this.newline();
    this.text('Thank you for visiting K one Golf!');
    this.newline();
    this.newline();
    this.size(0, 0);
    this.text('Printed: ' + new Date().toLocaleString());
    this.newline();
    this.newline();

    // Cut paper
    this.cut();

    return this.commands;
  }

  getCommands(): ThermalCommand[] {
    return this.commands;
  }
}

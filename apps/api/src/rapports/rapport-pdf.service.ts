import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';
import { buildRapportHtml } from './rapport-pdf.template';

type RapportPourPdf = Parameters<typeof buildRapportHtml>[0];

function slugify(nom: string) {
  return (
    nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'rapport'
  );
}

/** Rendu HTML → PDF via Chrome headless (Puppeteer). Un seul navigateur partagé, réutilisé entre exports. */
@Injectable()
export class RapportPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(RapportPdfService.name);
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return this.browser;
  }

  async render(rapport: RapportPourPdf): Promise<{ buffer: Buffer; filename: string }> {
    const html = buildRapportHtml(rapport);
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
      });
      return { buffer: Buffer.from(buffer), filename: `${slugify(rapport.nom)}.pdf` };
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy() {
    try {
      await this.browser?.close();
    } catch (error) {
      this.logger.warn(`Fermeture du navigateur PDF échouée: ${error}`);
    }
  }
}

declare module "pdf-parse" {
  interface PdfParseResult {
    numpages: number;
    text: string;
  }

  function pdfParse(data: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}

import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export class HandlebarsService {
  private readonly templateDir: string;

  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  /**
   * Renders a template with the given data
   * @param templateName - The name of the template file (without extension)
   * @param data - The data to be used in the template
   * @returns The rendered template string
   */
  renderTemplate(templateName: string, data: Record<string, any>): string {
    const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
    console.log("Template Path", templatePath);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    return template(data);
  }
}

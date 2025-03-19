const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

class HandlebarsService {
  constructor(templateDir) {
    this.templateDir = templateDir;
  }

  loadTemplate(templateName) {
    const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    return Handlebars.compile(templateContent);
  }

  renderTemplate(templateName, data) {
    const template = this.loadTemplate(templateName);
    return template(data);
  }
}

module.exports = HandlebarsService;

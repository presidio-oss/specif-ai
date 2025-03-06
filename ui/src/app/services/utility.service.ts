import { RequirementTypeEnum } from '../model/enum/requirement-type.enum';

export class UtilityService {
  /**
   * Returns the expansion of the requirement type abbreviation.
   * @param abbreviation
   * @returns
   */
  expandRequirementName(abbreviation: string): string {
    if (!abbreviation) {
      return abbreviation;
    }
    const match = abbreviation.match(/([A-Z]+)(\d+)/);
    if (!match) {
      return abbreviation;
    }
    const [_, prefix, number] = match;
    switch (prefix) {
      case RequirementTypeEnum.BRD:
        return `Business Requirement ${number}`;
      case RequirementTypeEnum.PRD:
        return `Product Requirement ${number}`;
      case RequirementTypeEnum.NFR:
        return `Non Functional Requirement ${number}`;
      case RequirementTypeEnum.UIR:
        return `User Interface Requirement ${number}`;
      case RequirementTypeEnum.BP:
        return `Business Process ${number}`;
      default:
        return `${abbreviation}`;
    }
  }

  getRequirementType(abbreviation: string): string {
    const match = abbreviation.match(/([A-Z]+)(\d+)/);
    if (!match) {
      return abbreviation;
    }
    const [_, prefix, number] = match;
    return prefix;
  }

  getProductRequirements(
    rd: any,
    directContent: boolean = false,
    fontWeight: string = 'font-bold',
  ): string {
    let key = '';
    let fullText = '';
    if (!directContent) {
      key = this.getKeys(rd)[0];
      fullText = rd[key];
    } else {
      fullText = rd;
    }

    let productRequirements = '';
    let screensText = '';
    let personasText = '';

    if (fullText.includes('Screens:')) {
      [productRequirements, fullText] = fullText.split('Screens:');
    } else {
      productRequirements = fullText;
    }

    if (fullText.includes('Personas:')) {
      [screensText, personasText] = fullText.split('Personas:');
    } else {
      screensText = fullText;
    }

    let details = `${productRequirements.trim()}`;

    if (screensText && screensText.trim() !== productRequirements.trim()) {
      details += `<br><br><h3 class="${fontWeight} text-secondary-900 hover:text-secondary-600">SCREENS</h3>${screensText.trim()}`;
    }

    if (personasText && personasText.trim()) {
      details += `<br><br><h3 class="${fontWeight} text-secondary-900 hover:text-secondary-600">PERSONAS</h3>${personasText.trim()}`;
    }

    return details;
  }

  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }
}

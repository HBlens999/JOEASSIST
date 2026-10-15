import { CustomTemplateDefinition } from './adapter';

/**
 * Registry of custom user templates.
 * When the user provides the seven original HTML CV template files,
 * they can be registered here as custom components with preserved visual styling.
 */
export const customTemplateRegistry: Map<string, CustomTemplateDefinition> = new Map();

export function registerCustomTemplate(template: CustomTemplateDefinition) {
  customTemplateRegistry.set(template.id, template);
}

export function getCustomTemplate(id: string): CustomTemplateDefinition | undefined {
  return customTemplateRegistry.get(id);
}

export function getAllCustomTemplates(): CustomTemplateDefinition[] {
  return Array.from(customTemplateRegistry.values());
}

// Users live in the auth module; this module only asks which ids are inspectors
export interface InspectorDirectory {
  filterInspectors(ids: string[]): Promise<string[]>;
}

export const INSPECTOR_DIRECTORY = Symbol('INSPECTOR_DIRECTORY');

export interface Project {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export function createProject(name: string, code: string): Project {
  const now = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return {
    id: `proj_${now}_${randomSuffix}`,
    name: name.trim() || 'Untitled Project',
    code,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export function validateProject(data: unknown): data is Project {
  if (typeof data !== 'object' || data === null) return false;
  const p = data as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.code === 'string' &&
    typeof p.createdAt === 'number' &&
    typeof p.updatedAt === 'number' &&
    typeof p.version === 'number'
  );
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(jsonStr: string): Project | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (validateProject(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

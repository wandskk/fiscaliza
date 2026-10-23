import { Role } from '@fiscaliza/shared';

export const CognitoGroup = {
  INSPECTOR: 'inspector',
  MANAGER: 'manager',
} as const;

// Someone in both groups gets the wider permission, since being a manager is the deliberate choice
export function roleFromGroups(groups: readonly string[]): Role | undefined {
  if (groups.includes(CognitoGroup.MANAGER)) return Role.MANAGER;
  if (groups.includes(CognitoGroup.INSPECTOR)) return Role.INSPECTOR;
  return undefined;
}

export interface UserProps {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  // The ID token may have no name; the e-mail is what the user recognizes
  static create(data: Omit<UserProps, 'name'> & { name?: string }): User {
    return new User({ ...data, name: data.name ?? data.email });
  }

  static restore(props: UserProps): User {
    return new User({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get role(): Role {
    return this.props.role;
  }

  changeRole(role: Role): boolean {
    if (this.props.role === role) return false;
    this.props.role = role;
    return true;
  }

  toProps(): UserProps {
    return { ...this.props };
  }
}

import { photoFileSchema } from '@fiscaliza/shared';
import { PhotoRejectedError } from './inspection.errors';

export interface PhotoProps {
  id: string;
  key: string;
  contentType: string;
  size: number;
}

export class Photo {
  private constructor(private readonly props: PhotoProps) {}

  static create(props: PhotoProps): Photo {
    if (!photoFileSchema.safeParse(props).success) throw new PhotoRejectedError();
    return new Photo({ ...props });
  }

  static restore(props: PhotoProps): Photo {
    return Photo.create(props);
  }

  get id(): string {
    return this.props.id;
  }
  get key(): string {
    return this.props.key;
  }
  get contentType(): string {
    return this.props.contentType;
  }
  get size(): number {
    return this.props.size;
  }

  toProps(): PhotoProps {
    return { ...this.props };
  }
}

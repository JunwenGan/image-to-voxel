export type AppStatus =
  | 'idle'
  | 'generating_image'
  | 'generating_voxels'
  | 'error';

export type ViewMode = 'image' | 'voxel';

export interface Example {
  img: string;
  html: string;
  title: string;
  color?: string;
}

export interface UserContent {
  image: string;
  voxel: string | null;
  prompt: string;
}

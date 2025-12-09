export interface FeatureProps {
  title: string;
  description: string;
  imageType: string;
  align?: 'left' | 'right';
  theme?: 'black' | 'white' | 'green';
  comingSoon?: boolean;
}

export enum IconType {
  DOLLAR = 'dollar',
  BITCOIN = 'bitcoin',
  CARD = 'card',
}

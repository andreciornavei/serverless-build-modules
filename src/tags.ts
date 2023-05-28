import { Tags } from 'yaml';

export const parseTags: Tags = [
  {
    tag: '!Ref',
    resolve: (value: any) => {
      return { Ref: value };
    },
  },
  {
    tag: '!GetAtt',
    resolve: (value: any) => {
      return { GetAtt: value };
    },
  },
  {
    tag: '!Sub',
    resolve: (value: any) => {
      return { Sub: value }
    }
  }
];

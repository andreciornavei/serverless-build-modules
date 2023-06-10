import { Tags } from 'yaml';
import { SLS_TAGS } from './types';

export const customTags: Tags = SLS_TAGS.map(TAG => {
  const [tagname, collection] = TAG.split(" ")
  return {
    tag: `!${tagname}`,
    collection: collection,
    type: "PLAIN",
    identify: (v:any) => String(v).startsWith(`!${tagname} `),
    resolve: (value: any) => `!${tagname} ${value}`,
  }
}) as unknown as Tags
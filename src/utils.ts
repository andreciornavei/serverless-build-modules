import { SLS_TAGS } from "./types";

export function removeQuotes(phrase: string, specificKey: string): string {
    const regex = /"(.*?)"/g;
    let newPhrase = phrase.replace(regex, (match, content) => {
      if (content.startsWith(specificKey)) {
        return content;
      } else {
        return match;
      }
    });
    return newPhrase;
}

export function removeTagQuotes(yaml: string): string {
    let buildYml = yaml
    for(const TAG of SLS_TAGS){
        const [tagname] = TAG.split(" ")
        buildYml = removeQuotes(buildYml, `!${tagname}`)        
    }
    return buildYml
}
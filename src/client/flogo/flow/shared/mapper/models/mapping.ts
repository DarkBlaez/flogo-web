import { IMapExpression} from './map-model';
import { IMapping } from './imapping';

export class Mapping implements IMapping {

  /**
   * Individual mapping
   * e.g. a.b.c => String.concat(x.a,y.b)
   * maps are stored in insertion order
   */
  mappings: {[key: string]: IMapExpression};

  /**
   * Individual mapping
   * e.g. a.b.c => String.concat(x.a,y.b)
   * maps are stored in insertion order
   */
  getMappings(): {[key: string]: IMapExpression} {
    return null;
  }

}


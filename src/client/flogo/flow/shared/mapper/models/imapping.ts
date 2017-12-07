import { STRING_MAP } from '@flogo/flow/shared/mapper/models/map-model';
import { IMapExpression } from '@flogo/flow/shared/mapper';

/**
 * Root Level mapping for the whole mapper
 * This object is serializable
 */
export interface IMapping {
  /**
   * Individual mapping
   * e.g. a.b.c => String.concat(x.a,y.b)
   * maps are stored in insertion order
   */
  mappings: STRING_MAP<IMapExpression>;

  /**
   * Individual mapping
   * e.g. a.b.c => String.concat(x.a,y.b)
   * maps are stored in insertion order
   */
  // getMappings(): STRING_MAP<IMapExpression>;

}
